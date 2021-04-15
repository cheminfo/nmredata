import JSZip from 'jszip';
import { getShortestPaths } from 'openchemlib-utils';

export async function nmredataToJSON(nmredata, options) {
  let moleculeAndMap = options.molecule;
  let data = {
    molfile: moleculeAndMap.molecule.toMolfile(),
    spectra: { nmr: [] },
    atoms: [],
    highlight: [],
  };
  let nmr = data.spectra.nmr;
  let labels = getLabels(nmredata.ASSIGNMENT);
  labels = addDiaIDtoLabels(labels, moleculeAndMap);
  // if (nmredata['J'] && nmredata['J'].data) {
  //   let jMatrix = getJMatrix(nmredata['J'].data);
  // }
  for (let key in labels) {
    let diaID = labels[key].diaID;
    data.atoms[diaID] = labels[key].position;
    data.highlight.push(diaID);
  }
  for (let tag in nmredata) {
    if (!tag.toLowerCase().match(/1d/s)) continue;
    let frequencyLine = nmredata[tag].data.find(
      (e) => e.value.key === 'Larmor',
    );
    let nucleus = getNucleus(tag);
    let width = nucleus.match(/13C/) ? 0.1 : 0.02;
    let jcamp = await getJcamp(nmredata[tag], options);
    let zipFolder = await extractZipFolder(nmredata[tag], options);
    let spectrum = {
      source: {
        zip: zipFolder,
        jcamp,
      },
      range: [],
      nucleus,
      frequency: frequencyLine.value.value,
      experiment: '1d',
      headComment: nmredata[tag].headComment,
    };
    let ranges = spectrum.range;
    let rangeData = nmredata[tag].data.filter((e) => e.value.delta);
    rangeData.forEach((rangeD) => {
      let { value, comment } = rangeD;
      let signalData = getSignalData(value, labels);
      signalData.pubAssignment.forEach((assignment) => {
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
// }

function getRangeData(rangeData, signal, comment, width) {
  // @TODO change for support range from tags
  let integral;
  let delta = rangeData.delta;
  let [from, to] = delta.match('-')
    ? delta.split('-').map((e) => Number(e).toFixed(3))
    : [Number(delta) - width, Number(delta) + width];
  // [from, to] = [Number(from).toFixed(3), Number(to).toFixed(3)];
  if (rangeData.nbAtoms) {
    integral = Number(rangeData.nbAtoms);
  } else if (rangeData.pubIntegral) {
    integral = Number(rangeData.pubIntegral);
  }
  return { from, to, integral, signal: [signal], comment };
}

async function getJcamp(tag, options) {
  let { zip, root } = options;
  let locationLine = tag.data.find((e) => e.value.key === 'Spectrum_Location');
  let path = root + locationLine.value.value.replace(/file:/s, '');
  if (!zip.file(path)) {
    new Error(`There is not jcamp with path: ${path}`);
    return null;
  }
  return await zip.file(path).async('string');
}

async function extractZipFolder(tag, options) {
  let { zip, root } = options;
  let locationLine = tag.data.find((e) => e.value.key === 'Spectrum_Location');
  
  if (!locationLine) {
    new Error(`There is not spectrum for ${tag}`);
    return null;
  }

  let path = root + locationLine.value.value.replace(/file:/s, '');
  let toCheck = path.replace(/(.*\w+\/[0-9]+\/)pdata\/.*/, '$1');
  let toCheck2 = path.replace(/.*\/[0-9]+\/pdata\/([0-9]+)\/.*/, '$1');

  let zipFolder = new JSZip();
  for (let file in zip.files) {
    if (toCheck !== file.replace(/(.*\w+\/[0-9]+\/)pdata\/.*/, '$1')) continue;
    if (file.match('pdata')) {
      if (toCheck2 !== file.replace(/.*\/[0-9]+\/pdata\/([0-9]+)\/.*/, '$1')) continue;
    }
    if (file.endsWith('/')) continue;
    console.log(file)
    zipFolder.file(file, await zip.file(file).async('arraybuffer'));
  }
  return await zipFolder.generateAsync({
    type: 'base64',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
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
  // ADD HIDROGENS TO BE SURE, THE ORIGINAL POSITION IT IS MAP OBJECT
  molecule.addImplicitHydrogens();

  let connections = getShortestPaths(molecule, { toLabel: 'H', maxLength: 1 });
  // parse each label to get the connectivity of Hidrogens

  for (let l in labels) {
    let label = labels[l];
    let atoms = label.atoms;
    label.position = [];
    if (atoms[0].toLowerCase().includes('h')) {
      // this is for implicit hidrogens
      let connectedTo = Number(atoms[0].toLowerCase().replace('h', '')) - 1;
      // map object has the original atom's possition in molfile
      connectedTo = map.indexOf(connectedTo);

      let shortPath = connections[connectedTo].find(
        (path) => path && path.length > 1,
      );
      label.position = connections[shortPath[0]]
        .filter((hc) => hc && hc.length > 1)
        .map((hc) => hc[hc.length - 1]);
    } else if (atoms[0].toLowerCase().match(/\w/s)) {
      atoms.forEach((a) => {
        let p = map.indexOf(Number(a) - 1);
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
    labels[l].diaID = diaID;
  }
  return labels;
}
