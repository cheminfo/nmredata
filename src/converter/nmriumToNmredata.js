import { Molecule as OCLMolecule } from 'openchemlib/full';
import {
  getGroupedDiastereotopicAtomIDs,
  getShortestPaths,
  getPathsInfo,
} from 'openchemlib-utils';

const tags = {
  solvent: 'SOLVENT',
  temperature: 'TEMPERATURE',
  assignment: 'ASSIGNMENT',
  j: 'J',
  signals: 'SIGNALS',
  id: 'ID',
};

export function nmriumToNmredata(state, options = {}) {
  const {
    spectra: data, //it would be changed depending of the final location
    molecules,
    correlations,
    multipleAnalysis,
  } = state || {
    spectra: [], // it would be changed depending of the final location
    molecules: [],
    preferences: {},
    correlations: {},
    multipleAnalysis: {},
  };

  const { id, prefix = '\n> <NMREDATA_' } = options;

  let sdfResult = '';

  let molfile = molecules[0].molfile;

  let molecule = OCLMolecule.fromMolfile(molfile);
  molecule.addImplicitHydrogens();
  let groupedDiaIDs = getGroupedDiastereotopicAtomIDs(molecule);
  console.log(groupedDiaIDs);

  let groupedOptions = {
    prefix,
    molecule,
    groupedDiaIDs,
  };

  sdfResult += molfile;
  let labels = getLabels(data, groupedOptions);
  // console.log('labels', labels);
  sdfResult += prefix + 'VERSION>\n1.1\\\n';
  sdfResult += putTag(data, 'temperature');
  sdfResult += putTag(data, 'solvent');

  if (id) {
    sdfResult += prefix + tags['id'] + '>\nid\\\n';
  }

  sdfResult += formatAssignments(labels.byDiaID, groupedOptions);

  sdfResult += get1DSignals(data, labels, groupedOptions);
  console.log(sdfResult);
  //   sdfResult += '\n$$$$\n';
}

function get1DSignals(data, labels, options = {}) {
  const { prefix } = options;
  let debugg = false;
  if (debugg) console.log('GET1DSIGNALS');
  let str = '';
  let nucleusArray = [];
  for (let spectrum of data) {
    if (spectrum.info.dimension > 1) continue;
    // if (!spectrum.hasOwnProperty('range') || !spectrum.range.length) continue;

    // let ranges = spectrum.range.filter(r => {
    //     if (!r.hasOwnProperty('signal')) return false;
    //     if (!r.signal.some((s) => {
    //         return s.hasOwnProperty('diaID') && s.diaID.length
    //         })) return false;
    //     return true;
    // });
    let ranges = spectrum.ranges.values || [];

    if (debugg) console.log('ranges', ranges);
    // if (!ranges.length) continue;

    let nucleus = spectrum.info.nucleus;
    let counter = 1;
    let subfix = '';
    nucleusArray.forEach((e) => {
      if (e === nucleus) counter++;
    });

    if (counter > 1) subfix = '#' + counter;

    let toFix;
    switch (nucleus) {
      case '1H':
        str += prefix + '1D_1H' + subfix + '>';
        toFix = 2;
        break;
      case '13C':
        str += prefix + '1D_13C' + subfix + '>';
        toFix = 1;
    }
    nucleusArray.push(nucleus);

    if (spectrum.info.frequency)
      str += '\nLarmor=' + Number(spectrum.info.frequency).toFixed(2) + '\\';
    //improve it because we have every thing in the browser, check if there is the posibility to add flat data {x, y}.
    // if (spectrum.isJcamp) {
    //     nmrRecord.file('jcampData/'+spectrum.jcamp.filename, spectrum.jcamp.data);
    //     str += '\nSpectrum_Location=file\:jcampData/' + spectrum.jcamp.filename + '\\';
    // } else if (spectrum.path) {
    //     console.log(spectrum)
    //     let pdataIndex = spectrum.path.indexOf('pdata');
    //     let path = spectrum.path.slice(0, pdataIndex).join('/');
    //     let zipFolder = zip.filter(file => file.includes(path));
    //     console.log(zipFolder)
    //     for (let file of zipFolder) {
    //         if (file.dir) continue;
    //         let fileData = await zip.file(file.name).async('uint8array');
    //         nmrRecord.file(file.name, fileData);
    //     }
    //     str += '\nSpectrum_Location=file\:' + spectrum.path.join('/') + '/\\' ;
    // }

    for (let range of ranges) {
      let signals = range.signal.filter(
        (s) => s.hasOwnProperty('diaID') && s.diaID.length,
      );
      if (debugg) console.log('signals', signals);

      for (let signal of signals) {
        let { multiplicity } = signal;
        if ((!multiplicity || multiplicity === 'm') && nucleus === '1H') {
          str +=
            '\n' +
            Number(range.from).toFixed(toFix) +
            '-' +
            Number(range.to).toFixed(toFix);
        } else if (signal.hasOwnProperty('delta')) {
          str += '\n' + Number(signal.delta).toFixed(toFix);
        } else continue;

        let signalLabel = '';

        signal.diaID.forEach((diaID, i, arr) => {
          let separator = ', ';
          if (i === arr.length - 1) separator = '';
          let label = labels.byDiaID[diaID].label || diaID;
          signalLabel += label + separator;
        });
        str += ', L=' + signalLabel;
        if (nucleus === '1H') {
          if (signal.multiplicity) str += ', S=' + signal.multiplicity;

          let jCoupling = signal.j;
          if (Array.isArray(jCoupling) && jCoupling.length) {
            let separator = ', J=';
            for (let i = 0; i < jCoupling.length; i++) {
              str += `${separator}${Number(jCoupling[i].coupling).toFixed(3)}`;
              if (jCoupling[i].diaID) {
                let { diaID } = jCoupling[i];
                if (!Array.isArray(diaID)) diaID = [diaID];
                if (!diaID.length) continue;
                let jCouple =
                  labels[diaID[0]].label || String(diaID[0]);
                str += `(${jCouple})`;
              }
              separator = ', ';
            }
          }
          if (range.integral) {
            str += `, E=${Number(range.integral).toFixed(toFix)}`;
          } else if (range.pubIntegral) {
            str += `, E=${range.putIntegral.toFixed(toFix)}`;
          } else if (range.signal[0].nbAtoms !== undefined) {
            str += `, E=${range.signal[0].nbAtoms}`;
          }
        }
      }
      if (signals.length) str += '\\';
    }
    str += '\n';
  }

  return str;
}

function getLabels(data, options = {}) {
  const { groupedDiaIDs, molecule } = options;
  let debugg = false;
  let toFix;

  let connections = getShortestPaths(molecule, { toLabel: 'H', maxLength: 1 });

  if (debugg) console.log(molfile._atoms);
  let byDiaID = {};
  let byAssignNumber = {};
  for (let spectrum of data) {
    let nucleus = spectrum.info.nucleus[0];
    if (nucleus == '1H') {
      toFix = 2;
    } else {
      toFix = 1;
    }
    let ranges = spectrum.ranges.values || [];
    for (let range of ranges) {
      let signal = range.signal || [];
      for (let s of signal) {
        let diaIDs = s.diaID || [];
        for (let diaID of diaIDs) {
          if (Array.isArray(groupedDiaIDs[diaID]) || true) {
            if (debugg) console.log('hola signal', s);
            let delta = Number(s.delta).toFixed(toFix);
            //get atomLabel
            let groupedOclID = groupedDiaIDs.find((dia) => {
              if (dia.oclID === diaID) return true;
              return false;
            });
            // the addition of one in atom number it is because the atoms enumeration starts from zero

            let labelOptions = {
              atom: groupedOclID.atoms[0],
              molecule,
              connections,
              atomLabel: groupedOclID.atomLabel,
            };

            byDiaID[diaID] = {
              atoms: groupedOclID.atoms.map((e) => e + 1),
              shift: delta,
              label: createLabel(labelOptions),
            };

            for (let atom of groupedOclID.atoms) {
              labelOptions.atom = atom;
              byAssignNumber[atom] = {
                shift: delta,
                diaID,
                label: createLabel(labelOptions),
              };
            }
          }
        }
      }
    }
  }
  return { byAssignNumber, byDiaID };
}

function createLabel(options) {
  const { atom, molecule, atomLabel, connections } = options;
  console.log('atom', atom);
  let label = '';
  if (atomLabel !== 'C') {
    let connectedTo = connections[atom];
    let path = connectedTo.find((e) => e && e.length > 1);
    let pLabel = `${atomLabel}${path[0] + 1}`;
    let hLabel = `${molecule.getAtomLabel(path[1])}${path[1] + 1}`;
    label = `(${pLabel}${hLabel})`;
  } else {
    label = `(${atom + 1})`;
  }
  return label;
}

function formatAssignments(labels, options) {
  const { prefix } = options;
  let str = prefix + tags['assignment'] + '>\n';
  for (let l in labels) {
    let atoms = labels[l].atoms;
    str += labels[l].label + ', ' + labels[l].shift; // change to add label
    for (let atom of atoms) str += `, ${atom}`;
    str += '\\\n';
  }
  return str;
}

function putTag(spectra, tag, options = {}) {
  const { prefix } = options;
  let str = '';
  for (let spectrum of spectra) {
    if (spectrum.info.hasOwnProperty(tag)) {
      str += prefix + tags[tag] + '>\n' + String(spectrum.info[tag]) + '\\\n';
      break;
    }
  }
  return str;
}
