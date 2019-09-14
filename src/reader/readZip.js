import jszip from 'jszip';
import zipper from 'zip-local';
import {parse} from '../parser/parseSDF';
import {IOBuffer} from 'iobuffer';
import {resolve} from 'path';
import {convertFolder} from 'brukerconverter';

const BINARY = 1;
const TEXT = 2;
const files = {
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

export function readZipFileSync(path) {
    let zipData = zipper.sync.unzip(resolve(path)).memory();
    let zipFiles = zipData.unzipped_file;
    //obtain sdf files
    let sdfFiles = [];
    for (let file in zipFiles.files) {
        let pathFile = file.split('/');
        if (pathFile[pathFile.length - 1].match(/^[^\.].+sdf$/)) {
            var filename = pathFile[pathFile.length - 1].replace(/\.sdf/, '');
            let sdf = zipData.read(file, 'text');
            let parserResult = parse(sdf + '', {mixedEOL: true});
            parserResult.filename = filename;
            sdfFiles.push(parserResult);
        }
    }
    let folders = getSpectraFolders(zipFiles);
    let spectra = convertSpectraSync(folders, zipFiles);
    return {sdfFiles, spectra}
}

/**
 * Read nmr record file asynchronously
 * @param {*} zipData  data readed of zip file  
 * @param {*} options 
 * @return {} An Object with two properties folders and sdfFiles, folders has nmr spectra data, sdfFiles has all sdf files
 */
export async function readZipFile(zipData, options = {}) {//@TODO: Be able to read from a path
    var zip = new jszip();
    return zip.loadAsync(zipData, {base64: true}).then(async (zipFiles) => {
      let sdfFiles = await getSDF(zipFiles, options);
      let folders = getSpectraFolders(zipFiles)
      let spectra = await convertSpectra(folders, zipFiles, options);
      return {spectra, sdfFiles}
    })
}

function getSpectraFolders(zipFiles) { // Folders should contain jcamp too
    return zipFiles.filter((relativePath) => {
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
}

function convertSpectraSync(folders, zip, options = {}) {
    var spectra = new Array(folders.length);
    
    for(var i = 0; i < folders.length; ++i) {
        var len = folders[i].name.length;
        var name = folders[i].name;
        name = name.substr(0,name.lastIndexOf("/")+1);
        var currFolder = zip.folder(name);
        var currFiles = currFolder.filter(function (relativePath, file) {
            return files[relativePath] ? true : false;
        });
        var brukerFiles = {};
        if(name.indexOf("pdata")>=0){
            brukerFiles['acqus'] = zip.file(name.replace(/pdata\/[0-9]\//,"acqus")).asText();
        }
        for(var j = 0; j < currFiles.length; ++j) {
            var idx = currFiles[j].name.lastIndexOf('/');
            var name = currFiles[j].name.substr(idx + 1);
            if(files[name] === BINARY) {
                brukerFiles[name] = new IOBuffer(currFiles[j].asArrayBuffer());
            } else {
                brukerFiles[name] = currFiles[j].asText();
            }
        }
        spectra[i] = {"filename":folders[i].name,value:convertFolder(brukerFiles,options)};
    }
    return spectra;
}
  
  /**
   * Extract sdf files from a class of jszip an parse it
   * @param {*} zipFiles 
   * @param {*} options 
   * @returns {Array} Array of sdf parsed files
   */
  async function getSDF(zipFiles, options = {}) {
    let result = [];
    for (let file in zipFiles.files) {
        let pathFile = file.split('/');
        if (pathFile[pathFile.length - 1].match(/^[^\.].+sdf$/)) {
            var filename = pathFile[pathFile.length - 1].replace(/\.sdf/, '');
            let sdf = await zipFiles.file(file).async('string');
            let parserResult = parse(sdf + '', {mixedEOL: true});
            parserResult.filename = filename;
            result.push(parserResult);
        }
    }
    return result;
  }
  
  async function convertSpectra(folders, zipFiles, options) {
      var spectra = new Array(folders.length);
      for (let i = 0; i < folders.length; ++i) {
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
