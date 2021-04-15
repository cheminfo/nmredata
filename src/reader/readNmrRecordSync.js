import { resolve } from 'path';

import { convertFolder } from 'brukerconverter';
import { IOBuffer } from 'iobuffer';
import { convert } from 'jcampconverter';
import zipper from 'zip-local';
import { readFileSync } from 'fs';

import { NmrRecord } from '../NmrRecord';
import { parse } from '../parser/parseSDF';

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
  '2rr': BINARY,
};

export function readNmrRecordSync(path) {
  let zipData = zipper.sync.unzip(resolve(path)).memory();
  let zipFiles = zipData.unzipped_file;
  let sdfFiles = [];
  for (let file in zipFiles.files) {
    let pathFile = file.split('/');
    if (pathFile[pathFile.length - 1].match(/^[^.].+sdf$/)) {
      // @TODO change match to endWith string prototype
      let root = pathFile.slice(0, pathFile.length - 1).join('/');
      let filename = pathFile[pathFile.length - 1].replace(/\.sdf/, '');
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
  let zipFile = readFileSync(resolve(path), 'base64').toString();
  return new NmrRecord({ sdfFiles, spectra, zipFile });
}

function convertSpectraSync(folders, zip, options = {}) {
  let spectra = new Array(folders.length);

  for (let i = 0; i < folders.length; ++i) {
    let folderName = folders[i].name;
    folderName = folderName.substr(0, folderName.lastIndexOf('/') + 1);
    let currFolder = zip.folder(folderName);
    let currFiles = currFolder.filter((relativePath) => {
      return files[relativePath] ? true : false;
    });
    let brukerFiles = {};
    if (folderName.indexOf('pdata') >= 0) {
      brukerFiles.acqus = zip
        .file(folderName.replace(/pdata\/[0-9]\//, 'acqus'))
        .asText();
    }
    for (let j = 0; j < currFiles.length; ++j) {
      let idx = currFiles[j].name.lastIndexOf('/');
      let name = currFiles[j].name.substr(idx + 1);
      if (files[name] === BINARY) {
        brukerFiles[name] = new IOBuffer(currFiles[j].asArrayBuffer());
      } else {
        brukerFiles[name] = currFiles[j].asText();
      }
    }
    spectra[i] = {
      filename: folderName,
      value: convertFolder(brukerFiles, options),
    };
  }
  return spectra;
}

function getSpectraFolders(zipFiles) {
  // Folders should contain jcamp too
  let brukerFolders = zipFiles.filter((relativePath) => {
    if (relativePath.match('__MACOSX')) return false;
    if (relativePath.endsWith('1r')) {
      return true;
    }
    return false;
  });
  let jcampFolders = zipFiles.filter((relativePath) => {
    if (relativePath.match('__MACOSX')) return false;
    if (relativePath.endsWith('dx') || relativePath.endsWith('jcamp')) {
      return true;
    }
    return false;
  });
  return { jcampFolders, brukerFolders };
}

function processJcamp(folders, zipFiles) {
  let spectra = new Array(folders.length);
  for (let i = 0; i < folders.length; ++i) {
    let name = folders[i].name;
    let jcamp = zipFiles.file(name).asText();
    let value = convert(jcamp, {
      keepSpectra: true,
      keepRecordsRegExp: /^.+$/,
      xy: true,
    });
    spectra[i] = { filename: name, value };
  }
  return spectra;
}
