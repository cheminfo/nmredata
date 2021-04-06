import { Molecule as OCLMolecule } from 'openchemlib/full';
import { get2DSignals } from './util/get2DSignals';
import { get1DSignals } from './util/get1DSignals';
import { getLabels } from './util/getLabels';
import {
  getGroupedDiastereotopicAtomIDs,
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
    spectra: data, // it would be changed depending of the final location
    molecules,
  } = state || {
    spectra: [], // it would be changed depending of the final location
    molecules: [],
  };

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
  sdfResult += '\n$$$$\n';
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
