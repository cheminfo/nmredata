// import {readZipFileSync, readZipFile} from './reader/readZip';
import { readZipFile } from './reader/readZip';
import * as OCLfull from 'openchemlib-extended';
import {processContent} from './processor';
import {nmredataToSampleEln} from './converter/toJSON';

export class nmrRecord {
  constructor(nmrRecord) {
    if (!nmrRecord instanceof Object) {
      throw new Error('Cannot be called directly');
    }
    let {spectra, sdfFiles} = nmrRecord;
    this.spectra = spectra;
    this.sdfFiles = sdfFiles;
    this.activeElement = 0;
    this.nbSamples = sdfFiles.length
    return this;
  }

  static async read(nmrRecord) {
    let data = await readZipFile(nmrRecord)
    return new this(data);
  }

  // static readSync(path) {
  //   var data = readZipFileSync(path);
  //   return new this(data);
  // }

  getMol(i = this.activeElement) {
    i = this.checkIndex(i);
    let parserResult = this.sdfFiles[i];
    return parserResult.molecules[0].molfile;
  }

  getMoleculeAndMap(i = this.activeElement) {
    i = this.checkIndex(i);
    let molfile = this.getMol(i);
    return OCLfull.Molecule.fromMolfileWithAtomMap(molfile);
  }

  getNMReDataTags(i = this.activeElement) {
    i = this.checkIndex(i);
    let nmredataTags = {};
    let sdfFile = this.sdfFiles[i];
    let version = parseFloat(sdfFile.molecules[0]['NMREDATA_VERSION']);
    let toReplace = version > 1 ? [new RegExp(/\\\n*/g), '\n'] : [];
    sdfFile.labels.forEach((tag) => {
      if (tag.toLowerCase().match('nmredata')) {
        let key = tag.replace(/NMREDATA\_/, '');
        let data = version > 1 ? sdfFile.molecules[0][tag].replace(/\n*/g, '') : sdfFile.molecules[0][tag];
        data = data.replace(toReplace[0], toReplace[1]);
        nmredataTags[key] = data;
      }
    });
    return nmredataTags;
  }

  getNMReData(i = this.activeElement) {
    i = this.checkIndex(i);
    let result = {name: this.sdfFiles[i].filename};
    let nmredataTags = this.getNMReDataTags(i);
    Object.keys(nmredataTags).forEach((tag, index) => {
      if (tag.match(/2D/)) return;
      if (!result[tag]) result[tag] = {data: []};
      let tagData = result[tag];
      let dataSplited = nmredataTags[tag].split('\n');
      dataSplited.forEach(e => {
        let content = e.replace(/\;.*/g, '');
        let comment = e.match('\;') ? e.replace(/.*\;+(.*)/g, '$1') : '';
        if (content.length === 0) { // may be a head comment. is it always true?
          if (!tagData.headComment) tagData.headComment = []; // should this be array for several head comments?
          tagData.headComment.push(comment)
          return
        } 
        let value = processContent(content, {tag: tag});
        tagData.data.push({comment, value})
        
      })
    })
    return result;
  }

  getSpectraList(i = this.activeElement) {

  }

  getFileName(i = this.activeElement) {
    i = this.checkIndex(i);
    let sdf =this.sdfFiles[i];
    return sdf.filename;
  }
  getAllTags(i = this.activeElement) {
    i = this.checkIndex(i);
    let allTags = {};
    let sdfFile = this.sdfFiles[i];
    sdfFile.labels.forEach((tag) => {
      allTags[tag] = sdfFile.molecules[0][tag];
    })
    return allTags;
  }

  getSDFList() {
    let sdfFiles = this.sdfFiles;
    return sdfFiles.map((sdf) => sdf.filename);
  }

  toJSON(i = this.activeElement) {
    let index = this.checkIndex(i);
    let nmredata = this.getNMReData(index);
    return nmredataToSampleEln(nmredata, {
      spectra: this.spectra,
      molecule: this.getMoleculeAndMap(index),
      root: this.sdfFiles[index].root
    });
  }

  setActiveElement(nactiveSDF) {
    nactiveSDF = this.checkIndex(nactiveSDF);
    this.activeElement = nactiveSDF;
  }

  getSDFIndexOf(filename) {
    let index = this.sdfFiles.findIndex((sdf) => sdf.filename === filename);
    if (index === -1) throw new Error('There is not sdf with this filename: ', filename);
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
