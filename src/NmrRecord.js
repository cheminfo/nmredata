import { Molecule as OCLMolecule } from 'openchemlib/full';

import { nmredataToJSON } from './converter/nmredataToJSON';
import { parseSDF } from './parser/parseSDF';
import { processContent } from './processContent';
import { getSDF } from './util/getSDF';

export class NmrRecord {
  constructor(nmrRecord) {
    if (!(nmrRecord instanceof Object)) {
      throw new Error('Cannot be called directly');
    }
    let { sdfData, fileCollection } = nmrRecord;
    this.fileCollection = fileCollection;
    this.sdfData = sdfData;
    this.activeElement = 0;
    this.nbSamples = sdfData.length;
  }

  static async fromFileCollection(fileCollection) {
    const files = fileCollection.files;
    if (!Array.isArray(files) || files.length < 1) {
      throw new Error('should be at least 1 file');
    }
    const sdfData = await getSDF(fileCollection);
    return new NmrRecord({ sdfData, fileCollection });
  }

  getMol(i = this.activeElement) {
    i = this.checkIndex(i);
    let parserResult = this.sdfData[i];
    return parserResult.molecules[0].molfile;
  }

  getMoleculeAndMap(i = this.activeElement) {
    i = this.checkIndex(i);
    let molfile = this.getMol(i);
    return OCLMolecule.fromMolfileWithAtomMap(molfile);
  }

  getNMReDataTags(i = this.activeElement) {
    i = this.checkIndex(i);
    return getNMReDataTags(this.sdfData[i]);
  }

  getNMReData(i = this.activeElement) {
    i = this.checkIndex(i);
    return getNMReData(this.sdfData[i]);
  }

  getFileName(i = this.activeElement) {
    i = this.checkIndex(i);
    let sdf = this.sdfData[i];
    return sdf.filename;
  }

  getAllTags(i = this.activeElement) {
    //@TODO: check what is the result and fix
    i = this.checkIndex(i);
    let allTags = {};
    let sdfFile = this.sdfData[i];
    sdfFile.labels.forEach((tag) => {
      allTags[tag] = sdfFile.molecules[0][tag];
    });
    return allTags;
  }

  getSDFList() {
    let sdfData = this.sdfData;
    return sdfData.map((sdf) => sdf.filename);
  }

  toJSON(i = this.activeElement) {
    let index = this.checkIndex(i);
    return nmrRecordToJSON({
      fileCollection: this.fileCollection,
      sdf: this.sdfData[index],
    });
  }

  setActiveElement(index) {
    index = this.checkIndex(index);
    this.activeElement = index;
  }

  getActiveElement() {
    let sdfList = this.getSDFList();
    return sdfList[this.activeElement];
  }

  getSDFIndexOf(filename) {
    let index = this.sdfData.findIndex((sdf) => sdf.filename === filename);
    if (index === -1) {
      throw new Error('There is not sdf with this filename: ', filename);
    }
    return index;
  }

  checkIndex(index) {
    if (Number.isInteger(index)) {
      if (index >= this.sdfData.length) throw new Error('Index out of range');
      return index;
    } else {
      return this.getSDFIndexOf(index);
    }
  }
}

/**
 * format the nmredata information in a json
 * @param {object} [options = {}] - input data
 * @param {object|string} [options.sdf] - sdf string file or the object after parsing the sdf string file.NmrRecord
 * @param {Molecule} [options.molecule] - Molecule instance with map of the atom position, if undefined it will be generated from molfile.
 * @param {Jszip} [options.zip] - jszip instance of the zip file that contain the spectra data.
 * @returns
 */
// there is an error here, we should be able to export any index in sdf, add options use activeElement.
export const nmrRecordToJSON = (options = {}) => {
  let { sdf, molecule, fileCollection } = options;
  let sdfFile = checkSdf(sdf);
  molecule = !molecule
    ? OCLMolecule.fromMolfile(sdfFile.molecules[0].molfile)
    : molecule;

  molecule.addImplicitHydrogens();
  molecule = OCLMolecule.fromMolfileWithAtomMap(molecule.toMolfile());

  let nmredata = getNMReData(sdfFile);
  return nmredataToJSON(nmredata, {
    molecule,
    root: sdfFile.root,
    fileCollection,
  });
};

/**
 * Returns the nmredata information of every tag in the sdf file.
 * @param {object|string} sdf - sdf string file or the object after parsing the sdf string file.NmrRecord
 * @returns
 */

export const getNMReData = (sdf) => {
  let sdfFile = checkSdf(sdf);
  let result = { name: sdfFile.filename };
  let nmredataTags = getNMReDataTags(sdfFile);
  Object.keys(nmredataTags).forEach((tag) => {
    if (!result[tag]) result[tag] = { data: [] };
    let tagData = result[tag];
    let dataSplited = nmredataTags[tag].split('\n');
    dataSplited.forEach((e) => {
      let content = e.replace(/;.*/g, '').replace(/\r/g, '');
      let comment = e.match(';') ? e.replace(/.*;+(.*)/g, '$1') : '';
      if (content.length === 0) {
        // may be a head comment. is it always true?
        if (!tagData.headComment) tagData.headComment = []; // should this be array for several head comments?
        tagData.headComment.push(comment);
        return;
      }
      let value = processContent(content, { tag });
      tagData.data.push({ comment, value });
    });
  });
  return result;
};

/**
 * Returns the nmredata lines of every tag in the sdf file.
 * @param {object|string} sdf - sdf string file or the object after parsing the sdf string file.NmrRecord
 * @returns
 */

export const getNMReDataTags = (sdf) => {
  const sdfFile = checkSdf(sdf);
  const version = parseFloat(sdfFile.molecules[0].NMREDATA_VERSION);
  const nmredataTags = {};
  for (let tag of sdfFile.labels) {
    if (tag.toLowerCase().match('nmredata')) {
      if (!sdfFile.molecules[0]?.[tag]) continue;

      const key = tag.replace(/NMREDATA_/, '');
      let value = String(sdfFile.molecules[0][tag]);
      value = version > 1 ? value.replace(/\n*/g, '') : value;
      value = value.replace(/\\\n*/g, '\n');
      nmredataTags[key] = value;
    }
  }
  return nmredataTags;
};

function checkSdf(sdfData, options) {
  if (typeof sdfData === 'string') {
    let { filename = 'nmredata.sdf', root = '' } = options;
    let sdf = parseSDF(`${sdfData}`, { mixedEOL: true });
    return { ...sdf, root, filename };
  }
  return sdfData;
}
