

export function nmredataToSampleEln(nmredata, molecule) {
    var data = {molfile: '', spectra: {nmr: []}, atoms: [], highlight: []};
    var nmr = data.spectra.nmr;
    let labels = getLabels(nmredata['ASSIGNMENT']);
    labels = addDiaIDtoLabels(labels, molecule);
    for (let key in labels) {
        let diaID = labels[key].diaID;
        data.atoms[diaID] = labels[key].position;
        data.highlight.push(diaID);
    }
    for (let tag in nmredata) {
        if (!tag.toLowerCase().match(/1d/s)) continue;
        let spectrum = {range: [], experiment: '1d', headComment: nmredata[tag].headComment};
        let ranges = spectrum.range;
        let rangeData = nmredata[tag].data.filter(e => e.value.delta);
        rangeData.forEach(rangeD => {
            let {value, comment} = rangeD;
            let signalData = getSignalData(value);
            let range = getRangeData(value);
            let from = Number(signalData.delta) - 0.01;
            let to = Number(signalData.delta) + 0.01;
            ranges.push({from: from.toFixed(3), to: to.toFixed(3), signal: signalData, comment});
        });
        nmr.push(spectrum);
    }
    return data;
}

function getRangeData(rangeData) {
    let integral;
    let delta = Number(rangeData['delta']);
    let [from, to] = [delta - 0.01, delta + 0.01];
    if (rangeData['nbAtoms']) {
        integral = Number(rangeData['nbAtoms'])
    } else if (rangeData['pubIntegral']) {
        integral = Number(rangeData['pubIntegral'])
    }
    
}
function getSignalData(rangeData) {
    let result = {};
    let signalKeys = ['delta', 'nbAtoms', 'multiplicity', 'J', 'pubAssignment'];
    signalKeys.forEach(key => {
        let data = rangeData[key];
        if (data) result[key] = data;
    })
    return result;
}

function getNucleus(label) {
    let nucleus = [];
    let dimensions = label.match(/NMREDATA_([0-9])\w_/s)[1];
    if (dimensions === '1') {
        nucleus = label.substring(12, label.length).split('_');
    } else if (dimensions === '2') {
        let data = label.substring(12, label.length).split('_')
        for (let i = 0; i < data.length; i+=2) nucleus.push(data[i]);
    }
    return nucleus;
}
  
function getLabels(content) {
    let data = content.data;
    let labels = {};
    data.forEach((assignment) => {
        let value = assignment.value;
        let atoms = value.atoms;
        let shift = value.shift
        if (!labels[value.label]) {
            labels[value.label] = [];
        }
        labels[value.label].push({shift, atoms});
    })
    return labels;
  }

  function addDiaIDtoLabels(labels, moleculeWithMap) {
      let {molecule, map} = moleculeWithMap;
    let debugg = false;
    //ADD HIDROGENS TO BE SURE, THE ORIGINAL POSITION IT IS MAP OBJECT
    molecule.addImplicitHydrogens();
    
    let connections = molecule.getAllPaths({toLabel: 'H', maxLength: 1});
    if (debugg) console.log('conections', connections);
    // parse each label to get the connectivity of Hidrogens
    
    let minLabels = getMinLabel(labels);
    if (debugg) console.log('min of labels', minLabels);
    for (let l in labels) {
        let label = labels[l];
        let atoms = label[0].atoms;
        label.position = [];
        if (debugg) console.log('label', label)
        if (atoms[0].toLowerCase().includes('h')) {
            let connectedTo = Number(atoms[0].toLowerCase().replace('h', '')) - minLabels;
            
            //map object has the original atom's possition in molfile
            connectedTo = map.indexOf(connectedTo);
            if (debugg) console.log('hidrogen connected to:', connectedTo);
            let connection = connections.find((c, i) => {
                if (c.fromAtoms.some((fa) => fa === connectedTo)) {
                    connections.splice(i, 1);
                    return true;
                }
            });
            if (debugg) console.log('connection', connection);
            label.position = connection.toAtoms;
        } else if (atoms[0].toLowerCase().match(/\w/s)) {
            atoms.forEach(a => {
                let p = map.indexOf(Number(a) - minLabels);
                if (debugg) console.log(p, a)
                label.position.push(p)
            });
        }
    }
    
    let diaIDs = molecule.getDiastereotopicAtomIDs();
    
    for (let l in labels) {
        let diaID = [];
        labels[l].position.forEach((p) => {
            if (diaID.indexOf(diaIDs[p]) === -1) {
                diaID.push(diaIDs[p]);
            }
        })
        if (debugg) console.log('diaID', diaID);
        labels[l].diaID = diaID;
    }
    return labels;
  }

  function getMinLabel(labels) {
    let min = Number.MAX_SAFE_INTEGER;
    for (let l in labels) {
        let label = labels[l];
        label[0].atoms.forEach((p) => {
            let pt = Number(p.replace(/[a-z]/g, ''));
            if (pt < min) min = pt;
        });
    }
    return min;
  }