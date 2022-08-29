import { Molecule as OCLMolecule } from 'openchemlib/full';

import { nmredataToJSON } from './converter/nmredataToJSON';
import { parseSDF } from './parser/parseSDF';
import { processContent } from './processContent';

export class NmrRecord {
  constructor(files) {
    if (!Array.isArray(files) || files.length < 1) {
      throw new Error('Cannot be called directly');
    }
    const sdfFiles = getSDF(files);
    this.zipFiles = files;
    this.sdfFiles = sdfFiles;
    this.activeElement = 0;
    this.nbSamples = sdfFiles.length;
  }

  getMol(i = this.activeElement) {
    i = this.checkIndex(i);
    let parserResult = this.sdfFiles[i];
    return parserResult.molecules[0].molfile;
  }

  getMoleculeAndMap(i = this.activeElement) {
    i = this.checkIndex(i);
    let molfile = this.getMol(i);
    return OCLMolecule.fromMolfileWithAtomMap(molfile);
  }

  getNMReDataTags(i = this.activeElement) {
    i = this.checkIndex(i);
    return NmrRecord.getNMReDataTags(this.sdfFiles[i]);
  }

  getNMReData(i = this.activeElement) {
    i = this.checkIndex(i);
    return NmrRecord.getNMReData(this.sdfFiles[i]);
  }

  getFileName(i = this.activeElement) {
    i = this.checkIndex(i);
    let sdf = this.sdfFiles[i];
    return sdf.filename;
  }

  getAllTags(i = this.activeElement) {
    //@TODO: check what is the result and fix
    i = this.checkIndex(i);
    let allTags = {};
    let sdfFile = this.sdfFiles[i];
    sdfFile.labels.forEach((tag) => {
      allTags[tag] = sdfFile.molecules[0][tag];
    });
    return allTags;
  }

  getSDFList() {
    let sdfFiles = this.sdfFiles;
    return sdfFiles.map((sdf) => sdf.filename);
  }

  toJSON(i = this.activeElement) {
    let index = this.checkIndex(i);
    return NmrRecord.toJSON({
      zipFiles: this.zipFiles,
      sdf: this.sdfFiles[index],
    });
  }

  setActiveElement(nactiveSDF) {
    nactiveSDF = this.checkIndex(nactiveSDF);
    this.activeElement = nactiveSDF;
  }

  getActiveElement() {
    let sdfList = this.getSDFList();
    return sdfList[this.activeElement];
  }

  getSDFIndexOf(filename) {
    let index = this.sdfFiles.findIndex((sdf) => sdf.filename === filename);
    if (index === -1) {
      throw new Error('There is not sdf with this filename: ', filename);
    }
    return index;
  }

  checkIndex(index) {
    if (Number.isInteger(index)) {
      if (index >= this.sdfFiles.length) throw new Error('Index out of range');
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
NmrRecord.toJSON = (options = {}) => {
  let { sdf, molecule, zipFiles } = options;
  let sdfFile = checkSdf(sdf);
  molecule = !molecule
    ? OCLMolecule.fromMolfile(sdfFile.molecules[0].molfile)
    : molecule;

  molecule.addImplicitHydrogens();
  molecule = OCLMolecule.fromMolfileWithAtomMap(molecule.toMolfile());

  let nmredata = NmrRecord.getNMReData(sdfFile);
  return nmredataToJSON(nmredata, {
    molecule,
    root: sdfFile.root,
    zipFiles,
  });
};

/**
 * Returns the nmredata information of every tag in the sdf file.
 * @param {object|string} sdf - sdf string file or the object after parsing the sdf string file.NmrRecord
 * @returns
 */

NmrRecord.getNMReData = (sdf) => {
  let sdfFile = checkSdf(sdf);
  let result = { name: sdfFile.filename };
  let nmredataTags = NmrRecord.getNMReDataTags(sdfFile);
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

NmrRecord.getNMReDataTags = (sdf) => {
  let sdfFile = checkSdf(sdf);
  let version = parseFloat(sdfFile.molecules[0].NMREDATA_VERSION);
  let toReplace = version > 1 ? [new RegExp(/\\\n*/g), '\n'] : [];

  let nmredataTags = {};
  for (let tag of sdfFile.labels) {
    if (tag.toLowerCase().match('nmredata')) {
      if (!sdfFile.molecules[0][tag]) continue;
      let key = tag.replace(/NMREDATA_/, '');
      let data =
        version > 1
          ? sdfFile.molecules[0][tag].replace(/\n*/g, '')
          : sdfFile.molecules[0][tag];
      data = data.replace(toReplace[0], toReplace[1]);
      nmredataTags[key] = data;
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

async function getSDF(files) {
  let result = [];
  for (const file of files) {
    const pathFile = file.webkitRelativePath.split('/');
    if (/^[^.].+sdf$/.exec(file.name)) {
      const filename = file.name.replace(/\.sdf/, '');
      const root = pathFile.slice(0, pathFile.length - 1).join('/');
      const sdf = await file.text();
      let parserResult = parseSDF(`${sdf}`, { mixedEOL: true });
      parserResult.filename = filename;
      parserResult.root = root !== '' ? `${root}/` : '';
      result.push(parserResult);
    }
  }
  return result;
}