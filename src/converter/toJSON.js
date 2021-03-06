
export function nmredataToSampleEln(nmredata, options) {
  var moleculeAndMap = options.molecule;
  var data = { molfile: moleculeAndMap.molecule.toMolfile(), spectra: { nmr: [] }, atoms: [], highlight: [] };
  var nmr = data.spectra.nmr;
  let labels = getLabels(nmredata.ASSIGNMENT);
  labels = addDiaIDtoLabels(labels, moleculeAndMap);
  // if (nmredata['J'] && nmredata['J'].data) {
  //   let jMatrix = getJMatrix(nmredata['J'].data);
  //   console.log('entra', nmredata['J'])
  // }
  for (let key in labels) {
    let diaID = labels[key].diaID;
    data.atoms[diaID] = labels[key].position;
    data.highlight.push(diaID);
  }
  for (let tag in nmredata) {
    if (!tag.toLowerCase().match(/1d/s)) continue;
    let frequencyLine = nmredata[tag].data.find((e) => e.value.key === 'Larmor');
    let nucleus = getNucleus(tag);
    let width = nucleus.match(/13C/) ? 0.1 : 0.02;
    let jcamp = getJcamp(nmredata[tag], options);
    let spectrum = {
      jcamp,
      range: [],
      nucleus,
      frequency: frequencyLine.value.value,
      experiment: '1d',
      headComment: nmredata[tag].headComment 
    };
    let ranges = spectrum.range;
    let rangeData = nmredata[tag].data.filter((e) => e.value.delta);
    rangeData.forEach((rangeD) => {
      let { value, comment } = rangeD;
      let signalData = getSignalData(value, labels);
      signalData.pubAssignment.forEach(assignment => {
        let label = labels[assignment];
        if (!signalData.diaID) signalData.diaID = [];
        if (!label) return;        
        signalData.diaID = signalData.diaID.concat(label.diaID);
      });
      let range = getRangeData(value, signalData, comment, width);
      ranges.push(range);
    });
    nmr.push(spectrum);
  }
  return data;
}

// function getJMatrix(content) {
//   let matrix = [];
//   let labels = [];
//   content.forEach(conection => {
//     let {from, to, coupling} = conection.value;
//     if (!labels.includes(from)) labels.push(from);
//     if (!labels.includes(to)) labels.push(to);
//   })
//   console.log(labels)
// }

function getRangeData(rangeData, signal, comment, width) {//@TODO change for support range from tags
  let integral;
  let delta = rangeData.delta;
  let [from, to] = delta.match('-') ? delta.split('-') : [Number(delta) - width, Number(delta) + width];
  [from, to] = [Number(from).toFixed(3), Number(to).toFixed(3)];
  if (rangeData.nbAtoms) {
    integral = Number(rangeData.nbAtoms);
  } else if (rangeData.pubIntegral) {
    integral = Number(rangeData.pubIntegral);
  }
  return { from, to, signal: [signal], comment }
}

function getJcamp(tag, options) {
  let { spectra, root } = options;
  let locationLine = tag.data.find((e) => e.value.key === 'Spectrum_Location');
  let path = root + locationLine.value.value.replace(/file\:/s, '');
  let jcamp = spectra.find((e) => e.filename === path);
  if (!jcamp) throw new Error(`There is not jcamp with path: ${path}`);
  return jcamp;
}

function getSignalData(rangeData, labels) {
  let result = {};
  let signalKeys = ['delta', 'nbAtoms', 'multiplicity', 'J', 'pubAssignment'];
  signalKeys.forEach((key) => {
    let data = rangeData[key];
    if (data) result[key] = data;
  });
  let needJdiaID = false;
  if (result.J) {
    needJdiaID = result.J.some((j) => {
      return Object.keys(j).some((e) => e === 'label');
    });
  }
  if (needJdiaID) {
    result.J.forEach((j, i, arr) => {
      if (j.label) {
        let label = labels[j.label];
        if (label) arr[i].diaID = label.diaID;
      }
    });
  }
  return result;
}

function getNucleus(label) {
  let nucleus = [];
  let dimensions = label.match(/([0-9])\w_/s)[1];
  if (dimensions === '1') {
    nucleus = label.substring(3, label.length);
  } else if (dimensions === '2') {
    let data = label.substring(12, label.length).split('_');
    for (let i = 0; i < data.length; i += 2) nucleus.push(data[i]);
  }
  return nucleus;
}

function getLabels(content) {
  let data = content.data;
  let labels = {};
  data.forEach((assignment) => {
    let value = assignment.value;
    let atoms = value.atoms;
    let shift = value.shift;
    if (!labels[value.label]) {
      labels[value.label] = [];
    }
    labels[value.label] = { shift, atoms };
  });
  return labels;
}

function addDiaIDtoLabels(labels, moleculeWithMap) {
  let { molecule, map } = moleculeWithMap;
  let debugg = false;
  // ADD HIDROGENS TO BE SURE, THE ORIGINAL POSITION IT IS MAP OBJECT
  molecule.addImplicitHydrogens();

  let connections = molecule.getAllPaths({ toLabel: 'H', maxLength: 1 });
  if (debugg) console.log('conections', connections);
  // parse each label to get the connectivity of Hidrogens

  for (let l in labels) {
    let label = labels[l];
    let atoms = label.atoms;
    label.position = [];
    if (debugg) console.log('label', label);
    if (atoms[0].toLowerCase().includes('h')) { //this is for implicit hidrogens
      if (debugg) console.log(atoms)
      let connectedTo = Number(atoms[0].toLowerCase().replace('h', '')) - 1;

      // map object has the original atom's possition in molfile
      connectedTo = map.indexOf(connectedTo);
      if (debugg) console.log('hidrogen connected to:', connectedTo);
      let connection = connections.find((c, i) => {
        return c.fromAtoms.some((fa) => fa === connectedTo)
      });
      if (debugg) console.log('connection', connection);
      label.position = connection.toAtoms;
    } else if (atoms[0].toLowerCase().match(/\w/s)) {
      atoms.forEach((a) => {
        let p = map.indexOf(Number(a) - 1);
        if (debugg) console.log(p, a);
        label.position.push(p);
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
    });
    if (debugg) console.log('diaID', diaID);
    labels[l].diaID = diaID;
  }
  return labels;
}

function getMinLabel(labels) {
  let min = Number.MAX_SAFE_INTEGER;
  for (let l in labels) {
    let label = labels[l];
    label.atoms.forEach((p) => {
      let pt = Number(p.replace(/[a-z]/g, ''));
      if (pt < min) min = pt;
    });
  }
  return min;
}
