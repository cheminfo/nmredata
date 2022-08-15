import Jszip from 'jszip';
import { getGroupedDiastereotopicAtomIDs } from 'openchemlib-utils';
import { Molecule as OCLMolecule } from 'openchemlib/full';

import { create1DSignals } from './util/fromNmrium/create1DSignals';
import { create2DSignals } from './util/fromNmrium/create2DSignals';
import { createLabels } from './util/fromNmrium/createLabels';

const tags = {
  solvent: 'SOLVENT',
  temperature: 'TEMPERATURE',
  assignment: 'ASSIGNMENT',
  j: 'J',
  signals: 'SIGNALS',
  id: 'ID',
};

export function nmriumToNmrRecord(state, options = {}) {
  const {
    spectra: data, // it would be changed depending of the final location
    molecules,
  } = state || {
    spectra: [], // it would be changed depending of the final location
    molecules: [],
  };

  const { id, prefix = '\n> <NMREDATA_', filename = 'nmredata' } = options;

  let sdfResult = '';
  let nmrRecord = new Jszip();

  let molecule = OCLMolecule.fromMolfile(molecules[0].molfile);
  molecule.addImplicitHydrogens();
  let groupedDiaIDs = getGroupedDiastereotopicAtomIDs(molecule);

  let groupedOptions = {
    prefix,
    molecule,
    groupedDiaIDs,
    nmrRecord,
  };

  sdfResult += molecule.toMolfile();
  let labels = createLabels(data, groupedOptions);
  sdfResult += `${prefix}VERSION>\n1.1\\\n`;
  sdfResult += putTag(data, 'temperature', { prefix });
  sdfResult += putTag(data, 'solvent', { prefix });

  if (id) {
    sdfResult += `${prefix + tags.id}>\nid\\\n`;
  }

  sdfResult += formatAssignments(labels.byDiaID, groupedOptions);
  sdfResult += create1DSignals(data, labels, groupedOptions);
  sdfResult += create2DSignals(data, labels, groupedOptions);
  sdfResult += '\n$$$$\n';
  nmrRecord.file(`${filename}.sdf`, sdfResult);
  return nmrRecord;
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
    if (spectrum.info[tag]) {
      str += `${prefix + tags[tag]}>\n${String(spectrum.info[tag])}\\\n`;
      break;
    }
  }
  return str;
}
