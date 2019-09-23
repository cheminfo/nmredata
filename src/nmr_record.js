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
    let parserResult = this.sdfFiles[i];
    return parserResult.molecules[0].molfile;
  }

  getMoleculeAndMap(i = this.activeElement) {
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
    let sdf =this.sdfFiles[i];
    return sdf.filename;
  }
  getAllTags(i = this.activeElement) {
    let allTags = {};
    let sdfFile = this.sdfFiles[i];
    sdfFile.labels.forEach((tag) => {
      allTags[tag] = sdfFile.molecules[0][tag];
    })
    return allTags;
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
    this.activeElement = nactiveSDF;
  }
}

/**
 * Read nmr record file asynchronously
 * @param {*} zipData  data readed of zip file  
 * @param {*} options 
 * @return {} An Object with two properties folders and sdfFiles, folders has nmr spectra data, sdfFiles has all sdf files
 */
async function readNmrRecord(zipData, options = {}) {
  var zip = new jszip();
  return zip.loadAsync(zipData, {base64: true}).then(async (zipFiles) => {
    let sdfFiles = await getSDF(zipFiles, options);
    let folders = zipFiles.filter((relativePath) => {
      if (relativePath.match('__MACOSX')) return false;
      if (
        relativePath.endsWith('ser') ||
        relativePath.endsWith('fid') ||
        relativePath.endsWith('1r') ||
        relativePath.endsWith('2rr')
      ) {
        return true;
      }
      return false;
    });
    let spectra = await convertSpectra(folders, zipFiles, options);
    return {spectra, sdfFiles}
  })
}

async function convertSpectra(folders, zipFiles, options) {
    var BINARY = 1;
    var TEXT = 2;
    var files = {
        'ser': BINARY,
        'fid': BINARY,
        'acqus': TEXT,
        'acqu2s': TEXT,
        'procs': TEXT,
        'proc2s': TEXT,
        '1r': BINARY,
        '1i': BINARY,
        '2rr': BINARY
    };
    var spectra = new Array(folders.length);
    for (let i = 0; i < folders.length; ++i) {
      console.log(folders[i].name)
      var promises = [];
      let name = folders[i].name;
      name = name.substr(0, name.lastIndexOf('/') + 1);
      promises.push(name);
      var currFolder = zipFiles.folder(name);
      var currFiles = currFolder.filter((relativePath) => {
        return files[relativePath] ? true : false;
      });
      if (name.indexOf('pdata') >= 0) {
        promises.push('acqus');
        promises.push(
          zipFiles.file(name.replace(/pdata\/[0-9]+\//, 'acqus')).async('string')
        );
      }
      for (var j = 0; j < currFiles.length; ++j) {
        var idx = currFiles[j].name.lastIndexOf('/');
        let name = currFiles[j].name.substr(idx + 1);
        promises.push(name);
        if (files[name] === BINARY) {
          promises.push(currFiles[j].async('arraybuffer'));
        } else {
          promises.push(currFiles[j].async('string'));
        }
      }
      spectra[i] = Promise.all(promises).then((result) => {
        let brukerFiles = {};
        for (let i = 1; i < result.length; i += 2) {
          let name = result[i];
          brukerFiles[name] = result[i + 1];
        }
        return { filename: result[0], value: convertFolder(brukerFiles, options) };
      });
    }
    return Promise.all(spectra);
}
