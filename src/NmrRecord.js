import { Molecule as OCLMolecule } from 'openchemlib/full';

import { nmredataToJSON } from './converter/nmredataToJSON';
import { nmredataToNmrium } from './converter/nmredataToNmrium';
import { processContent } from './processor';

export class NmrRecord {
  constructor(nmrRecord) {
    if (!(nmrRecord instanceof Object)) {
      throw new Error('Cannot be called directly');
    }
    let { spectra, sdfFiles, zip } = nmrRecord;
    this.zip = zip;
    this.spectra = spectra;
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
    let nmredataTags = {};
    let sdfFile = this.sdfFiles[i];
    let version = parseFloat(sdfFile.molecules[0].NMREDATA_VERSION);
    let toReplace = version > 1 ? [new RegExp(/\\\n*/g), '\n'] : [];
    sdfFile.labels.forEach((tag) => {
      if (tag.toLowerCase().match('nmredata')) {
        if (!sdfFile.molecules[0][tag]) return;
        let key = tag.replace(/NMREDATA_/, '');
        let data =
          version > 1
            ? sdfFile.molecules[0][tag].replace(/\n*/g, '')
            : sdfFile.molecules[0][tag];
        data = data.replace(toReplace[0], toReplace[1]);
        nmredataTags[key] = data;
      }
    });
    return nmredataTags;
  }

  getNMReData(i = this.activeElement) {
    i = this.checkIndex(i);
    let result = { name: this.sdfFiles[i].filename };
    let nmredataTags = this.getNMReDataTags(i);
    Object.keys(nmredataTags).forEach((tag) => {
      if (tag.match(/2D/)) return;
      if (!result[tag]) result[tag] = { data: [] };
      let tagData = result[tag];
      let dataSplited = nmredataTags[tag].split('\n');
      dataSplited.forEach((e) => {
        let content = e.replace(/;.*/g, '');
        let comment = e.match(';') ? e.replace(/.*;+(.*)/g, '$1') : '';
        if (content.length === 0) {
          // may be a head comment. is it always true?
          if (!tagData.headComment) tagData.headComment = []; // should this be array for several head comments?
          tagData.headComment.push(comment);
          return;
        }
        let value = processContent(content, { tag: tag });
        tagData.data.push({ comment, value });
      });
    });
    return result;
  }

  getSpectraList() {
    return this.spectra.map((e) => e.filename);
  }

  getFileName(i = this.activeElement) {
    i = this.checkIndex(i);
    let sdf = this.sdfFiles[i];
    return sdf.filename;
  }
  getAllTags(i = this.activeElement) {
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
    let nmredata = this.getNMReData(index);
    return nmredataToJSON(nmredata, {
      spectra: this.spectra,
      molecule: this.getMoleculeAndMap(index),
      root: this.sdfFiles[index].root,
      zip: this.zip,
    });
  }

  toNmrium(i = this.activeElement) {
    let index = this.checkIndex(i);
    let nmredata = this.getNMReData(index);
    return nmredataToNmrium(nmredata, {
      spectra: this.spectra,
      molecule: this.getMoleculeAndMap(index),
      root: this.sdfFiles[index].root,
      zip: this.zip,
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
    let result;
    if (Number.isInteger(index)) {
      if (index >= this.sdfFiles.length) throw new Error('Index out of range');
      result = index;
    } else {
      result = this.getSDFIndexOf(index);
    }
    return result;
  }
}
