import zipper from 'zip-local';
import {parse} from '../parser/parseSDF';
import {IOBuffer} from 'iobuffer';
import {resolve} from 'path';
import {convertFolder} from 'brukerconverter';
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

export function readZipSync(path) {
    let zipData = zipper.sync.unzip(resolve(path)).memory();
    let zipFiles = zipData.unzipped_file;
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
    return new nmrRecord({sdfFiles, spectra})
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
