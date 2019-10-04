const { readFileSync, writeFileSync } = require('fs');
const zipper = require('zip-local');
const {IOBuffer} = require('iobuffer');
const { resolve } = require('path');
const nmrRecord  = require('./lib/index');
const {convertFolder} = require('brukerconverter');

// var zipData = readFileSync(resolve('testFiles/menthol_1D_1H_assigned_J.zip'), 'base64') // 
var zipData = readFileSync(resolve('testFiles/generated.zip'), 'base64') // 

//reading asynchronously, 
nmrRecord.readNMRR(zipData).then((record) => {
  record.spectra.forEach(s => {
    console.log(s.filename)
  })

  // record has all sdf files and spectra data inside of nmrRecord file
  // let nbSDFFiles = record.nbSamples;
  let allTags = record.getAllTags();
  console.log(allTags)
  // let stringOfNMReDATATags = record.getNMReData();
  // nmredata['1D_1H'].data.forEach(e => {
  //   console.log(e.value)
  // })
  var json = record.toJSON();
  // console.log(json.spectra.nmr[2].range)
  // console.log(json.spectra.nmr[0].range[0].signal)
  // console.log(record.spectra[0].filename);
  //JSON.stringify()
  
  // console.log(record.getNMReData('compound1.nmredata'))
  //you can get the information of each sdf file 
  // for (let i = 0; i < record.nbSamples; i++) {
  //   let nmredata = record.getNMReData(i);
  //   let molfile = record.getNMReData(i);
  // }
});

function readSync(path) {
  let zipData = zipper.sync.unzip(resolve(path)).memory();
  let zipFiles = zipData.unzipped_file;
  //obtain sdf files
  let sdfFiles = [];
  for (let file in zipFiles.files) {
      console.log('aoseutrsao')
      let pathFile = file.split('/');
      if (pathFile[pathFile.length - 1].match(/^[^\.].+sdf$/)) {
        console.log('entra')
          var filename = pathFile[pathFile.length - 1].replace(/\.sdf/, '');
          let sdf = zipData.read(file, 'text');
          let parserResult = parse(sdf + '', {mixedEOL: true});
          parserResult.filename = filename;
          sdfFiles.push(parserResult);
      }
  }
  let folders = getSpectraFolders(zipFiles);
  // console.log(folders)
  let spectra = convertSpectraSync(folders, zipFiles);
  return sdfFiles
}
function convertSpectraSync(folders, zip, options = {}) {
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
      // console.log(brukerFiles)
      spectra[i] = {"filename":folders[i].name,value:convertFolder(brukerFiles, options)};
  }
  return spectra;
}

function parse(sdf, options = {}) {
  const {
    include,
    exclude,
    filter,
    modifiers = {},
    forEach = {},
    dynamicTyping = true
  } = options;

  if (typeof sdf !== 'string') {
    throw new TypeError('Parameter "sdf" must be a string');
  }

  var eol = '\n';
  if (options.mixedEOL) {
    sdf = sdf.replace(/\r\n/g, '\n');
    sdf = sdf.replace(/\r/g, '\n');
  } else {
    // we will find the delimiter in order to be much faster and not use regular expression
    var header = sdf.substr(0, 1000);
    if (header.indexOf('\r\n') > -1) {
      eol = '\r\n';
    } else if (header.indexOf('\r') > -1) {
      eol = '\r';
    }
  }

  var sdfParts = sdf.split(new RegExp(`${eol}\\$\\$\\$\\$.*${eol}`));
  var molecules = [];
  var labels = {};

  var start = Date.now();

  for (var i = 0; i < sdfParts.length; i++) {
    var sdfPart = sdfParts[i];
    var parts = sdfPart.split(`${eol}>`);
    if (parts.length > 0 && parts[0].length > 5) {
      var molecule = {};
      var currentLabels = [];
      molecule.molfile = parts[0] + eol;
      for (var j = 1; j < parts.length; j++) {
        var lines = parts[j].split(eol);
        var from = lines[0].indexOf('<');
        var to = lines[0].indexOf('>');
        var label = lines[0].substring(from + 1, to);
        currentLabels.push(label);
        if (!labels[label]) {
          labels[label] = {
            counter: 0,
            nbLines: '',
            isNumeric: dynamicTyping,
            keep: false
          };
          if (
            (!exclude || exclude.indexOf(label) === -1) &&
                        (!include || include.indexOf(label) > -1)
          ) {
            labels[label].keep = true;
            if (modifiers[label]) labels[label].modifier = modifiers[label];
            if (forEach[label]) labels[label].forEach = forEach[label];
          }
        }
        if (labels[label].keep) {
          for (var k = 1; k < lines.length - 1; k++) {
            if (molecule[label]) {
              molecule[label] += eol + lines[k];
            } else {
              molecule[label] = lines[k];
            } 
          }
          if (labels[label].modifier) {
            var modifiedValue = labels[label].modifier(molecule[label]);
            if (modifiedValue === undefined || modifiedValue === null) {
              delete molecule[label];
            } else {
              molecule[label] = modifiedValue;
            }
          }
          if (labels[label].isNumeric) {
            if (!isFinite(molecule[label]) || molecule[label].match(/^0[0-9]/)) {
              labels[label].isNumeric = false;
            }
          }
        }
      }
      if (!filter || filter(molecule)) {
        molecules.push(molecule);
        // only now we can increase the counter
        for (j = 0; j < currentLabels.length; j++) {
          var currentLabel = currentLabels[j];
          labels[currentLabel].counter++;
        }
      }
    }
  }
  ``
  // all numeric fields should be converted to numbers
  for (label in labels) {
    currentLabel = labels[label];
    if (currentLabel.isNumeric) {
      currentLabel.minValue = Infinity;
      currentLabel.maxValue = -Infinity;
      for (j = 0; j < molecules.length; j++) {
        if (molecules[j][label]) {
          var value = parseFloat(molecules[j][label]);
          molecules[j][label] = value;
          if (value > currentLabel.maxValue) currentLabel.maxValue = value;
          if (value < currentLabel.minValue) currentLabel.minValue = value;
        }
      }
    }
  }

  // we check that a label is in all the records
  for (var key in labels) {
    if (labels[key].counter === molecules.length) {
      labels[key].always = true;
    } else {
      labels[key].always = false;
    }
  }

  var statistics = [];
  for (key in labels) {
    var statistic = labels[key];
    statistic.label = key;
    statistics.push(statistic);
  }

  return {
    time: Date.now() - start,
    molecules: molecules,
    labels: Object.keys(labels),
    statistics: statistics
  };
}

function getSpectraFolders(zipFiles) {
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