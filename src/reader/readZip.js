import jszip from 'jszip';
import {parse} from '../parser/parseSDF';
import {IOBuffer} from 'iobuffer';
import {resolve} from 'path';
import {convertFolder} from 'brukerconverter';
import {convert} from 'jcampconverter';
import {nmrRecord} from '../nmr_record'

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

/**
 * Read nmr record file asynchronously
 * @param {*} zipData  data readed of zip file
 * @param {*} options
 * @return {} An Object with two properties folders and sdfFiles, folders has nmr spectra data, sdfFiles has all sdf files
 */
export async function readNMRR(zipData, options = {}) {//@TODO: Be able to read from a path
    var zip = new jszip();
    return zip.loadAsync(zipData, {base64: true}).then(async (zipFiles) => {
      let sdfFiles = await getSDF(zipFiles, options);
      let folders = getSpectraFolders(zipFiles)
      let spectra = await convertSpectra(folders.brukerFolders, zipFiles, options);
      let jcamps = await processJcamp(folders.jcampFolders, zipFiles, options);
      spectra = spectra.concat(jcamps);
      return new nmrRecord({sdfFiles, spectra});
    })
}

function getSpectraFolders(zipFiles) {
  let brukerFolders = zipFiles.filter((relativePath) => {
      if (relativePath.match('__MACOSX')) return false;
      if (relativePath.endsWith('1r')) {
        return true;
      }
      return false;
  });
  let jcampFolders = zipFiles.filter((relativePath) => {
      if (relativePath.match('__MACOSX')) return false;
      if (relativePath.endsWith('dx') ||
          relativePath.endsWith('jcamp')
      ) {
          return true;
      }
      return false;
  })
  return {jcampFolders, brukerFolders};
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
            var root = pathFile.slice(0,pathFile.length - 1).join('/');
            let sdf = await zipFiles.file(file).async('string');
            let parserResult = parse(sdf + '', {mixedEOL: true});
            parserResult.filename = filename;
            parserResult.root = root !== '' ? root + '/' : '';
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
            promises.push(currFiles[j].async('arraybuffer').then(r => new IOBuffer(r))); //@TODO: check the error - file.setLittleEndian is not a function -
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

  async function processJcamp(folders, zipFiles, options) {
    var spectra = new Array(folders.length);
    for (let i = 0; i < folders.length; ++i) {
      let name = folders[i].name;
      let jcamp = await zipFiles.file(name).async('string');
      let value = convert(jcamp, { keepSpectra: true, keepRecordsRegExp: /^.+$/, xy: true });
      spectra[i] = {filename: name, value}
    }
    return spectra;
  }