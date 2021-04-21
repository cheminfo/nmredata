import Jszip from 'jszip';

import { NmrRecord } from '../NmrRecord';
import { parseSDF } from '../parser/parseSDF';

/**
 * Read nmr record file and return an instance of NmrRecord class.
 * @param {buffer|string} zipFile - zip file in memory, if it is a string e.g base64 it is need to specify the enconding. See jszip for the encoding allowed
 * @param {object} [options={}] - options.
 * @param {object} [options.zipOptions] - jszip options.
 * @return {} An Object with two properties zip and sdfFiles.
 */
export async function readNmrRecord(zipFile, options = {}) {
  let { zipOptions = {} } = options;
  // @TODO: Be able to read from a path
  let jszip = new Jszip();
  return jszip.loadAsync(zipFile, zipOptions).then(async (zip) => {
    let sdfFiles = await getSDF(zip);
    return new NmrRecord({ sdfFiles, zipFiles: zip.files });
  });
}

/**
 * Extract sdf files from a instance of jszip of the nmrRecord and parse all of them.
 * @param {Jszip} zip - jszip instance of the zip file
 * @returns {Array} Array of sdf parsed files
 */
async function getSDF(zip) {
  let result = [];
  for (let file in zip.files) {
    let pathFile = file.split('/');
    if (pathFile[pathFile.length - 1].match(/^[^.].+sdf$/)) {
      let filename = pathFile[pathFile.length - 1].replace(/\.sdf/, '');
      let root = pathFile.slice(0, pathFile.length - 1).join('/');
      let sdf = await zip.file(file).async('string');
      let parserResult = parseSDF(`${sdf}`, { mixedEOL: true });
      parserResult.filename = filename;
      parserResult.root = root !== '' ? `${root}/` : '';
      result.push(parserResult);
    }
  }
  return result;
}
