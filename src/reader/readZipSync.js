import { resolve } from 'path';

import { IOBuffer } from 'iobuffer';
import zipper from 'zip-local';
import { convertFolder } from 'brukerconverter';
import { convert } from 'jcampconverter';

import { parse } from '../parser/parseSDF';
import { nmrRecord } from '../nmr_record';

const BINARY = 1;
const TEXT = 2;
const files = {
  ser: BINARY,
  fid: BINARY,
  acqus: TEXT,
  acqu2s: TEXT,
  procs: TEXT,
  proc2s: TEXT,
  '1r': BINARY,
  '1i': BINARY,
  '2rr': BINARY
};

export function readNMRRSync(path) {
  let zipData = zipper.sync.unzip(resolve(path)).memory();
  let zipFiles = zipData.unzipped_file;
  let sdfFiles = [];
  for (let file in zipFiles.files) {
    let pathFile = file.split('/');
    if (pathFile[pathFile.length - 1].match(/^[^\.].+sdf$/)) { // @TODO change match to endWith string prototype
      var root = pathFile.slice(0, pathFile.length - 1).join('/');
      var filename = pathFile[pathFile.length - 1].replace(/\.sdf/, '');
      let sdf = zipData.read(file, 'text');
      let parserResult = parse(`${sdf}`, { mixedEOL: true });
      parserResult.filename = filename;
      parserResult.root = root !== '' ? `${root}/` : '';
      sdfFiles.push(parserResult);
    }
  }
  let folders = getSpectraFolders(zipFiles);
  let spectra = convertSpectraSync(folders.brukerFolders, zipFiles);
  let jcamps = processJcamp(folders.jcampFolders, zipFiles);
  spectra = spectra.concat(jcamps);
  return new nmrRecord({ sdfFiles, spectra });
}

function convertSpectraSync(folders, zip, options = {}) {
  var spectra = new Array(folders.length);

  for (var i = 0; i < folders.length; ++i) {
    var len = folders[i].name.length;
    var folderName = folders[i].name;
    folderName = folderName.substr(0, folderName.lastIndexOf('/') + 1);
    var currFolder = zip.folder(folderName);
    var currFiles = currFolder.filter(function (relativePath, file) {
      return files[relativePath] ? true : false;
    });
    var brukerFiles = {};
    if (folderName.indexOf('pdata') >= 0) {
      brukerFiles.acqus = zip.file(folderName.replace(/pdata\/[0-9]\//, 'acqus')).asText();
    }
    for (var j = 0; j < currFiles.length; ++j) {
      var idx = currFiles[j].name.lastIndexOf('/');
      var name = currFiles[j].name.substr(idx + 1);
      if (files[name] === BINARY) {
        brukerFiles[name] = new IOBuffer(currFiles[j].asArrayBuffer());
      } else {
        brukerFiles[name] = currFiles[j].asText();
      }
    }
    spectra[i] = { filename: folderName, value: convertFolder(brukerFiles, options) };
  }
  return spectra;
}

function getSpectraFolders(zipFiles) { // Folders should contain jcamp too
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
  });
  return { jcampFolders, brukerFolders };
}

function processJcamp(folders, zipFiles, options) {
  var spectra = new Array(folders.length);
  for (let i = 0; i < folders.length; ++i) {
    let name = folders[i].name;
    let jcamp = zipFiles.file(name).asText();
    let value = convert(jcamp, { keepSpectra: true, keepRecordsRegExp: /^.+$/, xy: true });
    spectra[i] = { filename: name, value };
  }
  return spectra;
}
