import { Molecule as OCLMolecule } from 'openchemlib/full';
import {
  getGroupedDiastereotopicAtomIDs,
  getShortestPaths,
} from 'openchemlib-utils';

import { getCouplingObserved } from './util/getCouplingObserved';
import { getToFix } from './util/getToFix';
import { flat2DSignals } from './util/flat2DSignals';

const tags = {
  solvent: 'SOLVENT',
  temperature: 'TEMPERATURE',
  assignment: 'ASSIGNMENT',
  j: 'J',
  signals: 'SIGNALS',
  id: 'ID',
};

const isArray = Array.isArray;

export function nmriumToNmredata(state, options = {}) {
  const {
    spectra: data, // it would be changed depending of the final location
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
  console.log('data', data[0].info);
  const { id, prefix = '\n> <NMREDATA_' } = options;

  let sdfResult = '';

  let molecule = OCLMolecule.fromMolfile(molecules[0].molfile);
  molecule.addImplicitHydrogens();
  let groupedDiaIDs = getGroupedDiastereotopicAtomIDs(molecule);

  let groupedOptions = {
    prefix,
    molecule,
    groupedDiaIDs,
  };

  sdfResult += molecules[0].molfile;
  let labels = getLabels(data, groupedOptions);
  sdfResult += `${prefix}VERSION>\n1.1\\\n`;
  sdfResult += putTag(data, 'temperature', { prefix });
  sdfResult += putTag(data, 'solvent', { prefix });

  if (id) {
    sdfResult += `${prefix + tags.id}>\nid\\\n`;
  }

  sdfResult += formatAssignments(labels.byDiaID, groupedOptions);
  sdfResult += get1DSignals(data, labels, groupedOptions);
  sdfResult += get2DSignals(data, labels, groupedOptions);
  console.log(sdfResult);
  //   sdfResult += '\n$$$$\n';
}
function get2DSignals(data, labels, options = {}) {
  let { prefix } = options;
  let { byDiaID } = labels;
  let debugg = false;
  let str = '';
  let nucleusRecorded = [];
  for (let spectrum of data) {
    if (spectrum.info.dimension < 2) continue;

    let { nucleus, experiment, pulseSequence } = spectrum.info;

    let couplingObserved = getCouplingObserved(experiment);
    if (experiment) prefix = `\n> 2D ${experiment} <NMREDATA_2D_`;
    let counter = 1;
    let subfix = '';
    nucleusRecorded.forEach((e) => {
      if (e === nucleus) counter++;
    });

    if (counter > 1) subfix = `#${counter}`;

    if (nucleus) {
      str += `${prefix}${nucleus[1]}_${couplingObserved}_${nucleus[0]}>`;
    }
    let toFix = getToFix(nucleus);

    nucleusRecorded.push(nucleus);
    str +=
      `\nLarmor=${Number(spectrum.info.baseFrequency[0]).toFixed(2)}\\`;
    if (experiment) str += `\nCorType=${experiment} \\`;
    if (pulseSequence) str += `\nPulseProgram=${pulseSequence} \\`;

    let zones = spectrum.zones.values || [];
    for (let zone of zones) {
      let signals = zone.signal;
      for (let signal of signals) {
        let { x, y, peak } = signal;
        let xLabel = getAssignment(x, byDiaID, toFix[0]);
        let yLabel = getAssignment(y, byDiaID, toFix[1]);
        let intensity = Math.max(...peak.map((e) => e.z));
        str += `\n${xLabel}/${yLabel}, I=${intensity.toFixed(2)}\\`;
      }
    }
  }
  return str;
}

function getAssignment(axis, labels, toFix) {
  let { diaID, delta } = axis;
  if (diaID) {
    if (!isArray(diaID)) diaID = [diaID];
    if (diaID.length < 1) Number(delta).toFixed(toFix);
    let label = diaID.map((diaID) => labels[diaID].label).join(',');
    return diaID.length > 1 ? `(${label})` : label;
  }
  return Number(delta).toFixed(toFix);
}

function get1DSignals(data, labels, options = {}) {
  const { prefix } = options;
  let debugg = false;
  if (debugg) console.log('GET1DSIGNALS');
  let str = '';
  let nucleusArray = [];
  for (let spectrum of data) {
    console.log(spectrum.info);
    if (spectrum.info.dimension > 1) continue;

    let ranges = spectrum.ranges.values || [];

    let nucleus = spectrum.info.nucleus;
    let counter = 1;
    let subfix = '';
    nucleusArray.forEach((e) => {
      if (e === nucleus) counter++;
    });

    if (counter > 1) subfix = `#${counter}`;

    let toFix;
    switch (nucleus) {
      case '1H':
        str += `${prefix}1D_1H${subfix}>`;
        toFix = 2;
        break;
      case '13C':
        str += `${prefix}1D_13C${subfix}>`;
        toFix = 1;
    }
    nucleusArray.push(nucleus);

    if (spectrum.info.frequency) {
      str += `\nLarmor=${Number(spectrum.info.frequency).toFixed(2)}\\`;
    }
    // improve it because we have every thing in the browser, check if there is the posibility to add flat data {x, y}.
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
            `\n${
              Number(range.from).toFixed(toFix)
            }-${
              Number(range.to).toFixed(toFix)}`;
        } else if (signal.hasOwnProperty('delta')) {
          str += `\n${Number(signal.delta).toFixed(toFix)}`;
        } else {
          continue;
        }

        let signalLabel = '';

        signal.diaID.forEach((diaID, i, arr) => {
          let separator = ', ';
          if (i === arr.length - 1) separator = '';
          let label = labels.byDiaID[diaID].label || diaID;
          signalLabel += `(${label})${separator}`;
        });
        str += `, L=${signalLabel}`;
        if (nucleus === '1H') {
          if (signal.multiplicity) str += `, S=${signal.multiplicity}`;

          let jCoupling = signal.j;
          if (Array.isArray(jCoupling) && jCoupling.length) {
            let separator = ', J=';
            for (let i = 0; i < jCoupling.length; i++) {
              str += `${separator}${Number(jCoupling[i].coupling).toFixed(3)}`;
              if (jCoupling[i].diaID) {
                let { diaID } = jCoupling[i];
                if (!Array.isArray(diaID)) diaID = [diaID];
                if (!diaID.length) continue;
                let jCouple = labels[diaID[0]].label || String(diaID[0]);
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

  let connections = getShortestPaths(molecule, { toLabel: 'H', maxLength: 1 });

  if (debugg) console.log(molfile._atoms);
  let byDiaID = {};
  let byAssignNumber = {};
  for (let spectrum of data) {
    let { dimension, nucleus } = spectrum.info;
    let toFix = getToFix(nucleus);

    let [roiKey, flatSignals] =
      dimension > 1 ? ['zones', flat2DSignals] : ['ranges', (s) => s || []];

    let rois = spectrum[roiKey].values || [];
    for (let roi of rois) {
      let signals = flatSignals(roi.signal);
      console.log(signals);
      for (let i = 0; i < signals.length; i++) {
        let diaIDs = signals[i].diaID || [];
        for (let diaID of diaIDs) {
          let delta = Number(signals[i].delta).toFixed(toFix[i % dimension]);
          // get atomLabel
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
  return { byAssignNumber, byDiaID };
}

function createLabel(options) {
  const { atom, molecule, atomLabel, connections } = options;
  let label = '';
  if (atomLabel !== 'C') {
    let connectedTo = connections[atom];
    let path = connectedTo.find((e) => e && e.length > 1);
    let pLabel = `${atomLabel}${path[0] + 1}`;
    let hLabel = `${molecule.getAtomLabel(path[1])}${path[1] + 1}`;
    label = `${pLabel}${hLabel}`;
  } else {
    label = `${atomLabel}${atom + 1}`;
  }
  return label;
}

function formatAssignments(labels, options) {
  const { prefix } = options;
  let str = `${prefix + tags.assignment}>\n`;
  for (let l in labels) {
    let atoms = labels[l].atoms;
    str += `${labels[l].label}, ${labels[l].shift}`; // change to add label
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
      str += `${prefix + tags[tag]}>\n${String(spectrum.info[tag])}\\\n`;
      break;
    }
  }
  return str;
}
