'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var path = require('path');
var iobuffer = require('iobuffer');
var jszip = _interopDefault(require('jszip'));
var brukerconverter = require('brukerconverter');
var jcampconverter = require('jcampconverter');
var OCLfull = require('openchemlib-extended');
var zipper = _interopDefault(require('zip-local'));

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

function parse1DSignal(content, labels) {
  let signal = {};
  content = content.replace(/ /g, '');
  content = content.replace(/[l=] /g, '');
  content = content.replace(/,(\w=)/g,':$1');
  let data = content.split(':');
  data.forEach((d) => {
    d = d.toLowerCase();
    let value = d.replace(/^.*=/, '');
    let key = d.replace(/[=].*/, '');
    if (parseFloat(key)) {
      signal.delta = value;
    } else {
      signal[choseKey(key)] = choseProcess(value, key);
    }
  });
  return signal;
}

function choseKey(entry) {
  let key = '';
  switch (entry) {
    case 'j':
      key = 'J';
      break;
    case 's':
      key = 'multiplicity';
      break;
    case 'l':
      key = 'pubAssignment';
      break;
    case 'n':
      key = 'nbAtoms';
      break;
    case 'e':
    case 'i':
      key = 'pubIntegral';
      break;
  }
  return key;
}

function choseProcess(d, key) {
  let result;
  switch (key) {
    case 'l':
      result = getPubAssignment(d);
      break;
    case 'j':
      result = getCoupling(d);
      break;
    default:
      result = d;
  }
  return result;
}

function getPubAssignment(d) {
  return d.replace(/\s*/g, '').split(',');
}

function getCoupling(d) {
  let jCoupling = [];
  d = d.replace(/,([0-9])/g, ':$1');
  d = d.split(':');
  d.forEach((c) => {
    let value; let
      withIt = '';
    let toValue = c.indexOf('(');
    if (toValue === -1) {
      value = Number(c);
      jCoupling.push({ coupling: value });
    } else {
      value = Number(c.substring(0, toValue));
      withIt = c.substring(toValue + 1, c.length - 1);
      jCoupling.push({ coupling: value, label: withIt });
    }
  });
  return jCoupling;
}

function processContent(content, options) {
  let { tag } = options;
  let result;
  let processor = resultType(tag);
  let matchEqual = content.match(/=/g);
  if (!matchEqual && !content.match(',')) {
    result = content;
  } else if (matchEqual && matchEqual.length === 1) {
    result = propertyLinesProcessor(content);
  } else {
    result = processor(content, options);
  }
  return result;
}

function resultType(tag) {
  let processor;
  let ctag = tag.toLowerCase();
  if (ctag.match(/1d/)) ctag = '1d';
  switch (ctag.toLowerCase()) {
    case 'id': // it has property lines
      processor = propertyLinesProcessor;
      break;
    case '1d': // it has item list
      processor = parse1DSignal;
      break;
    case 'assignment': // it has item list
    case 'signals':
      processor = processAssignment;
      break;
    case 'j':
      processor = processAssignment; // @TODO change it
      break;
    case 'version':
    case 'solvent':
    case 'temperature':
    case 'level':
      break;
  }
  return processor;
}

function propertyLinesProcessor(content, options) {
  let value = content.replace(/^.*=/, '');
  let key = content.replace(/[=].*/, '');
  return { key, value };
}

function processAssignment(content) {
  content = content.replace(/ /g, '');
  content = content.split(',');
  let label = content[0].toLowerCase();
  let shift = content.slice(1, 2);// Be able to know when the shift published or not
  let atoms = content.slice(2);
  return { label, shift, atoms };
}

function nmredataToSampleEln(nmredata, options) {
  var moleculeAndMap = options.molecule;
  var data = { molfile: moleculeAndMap.molecule.toMolfile(), spectra: { nmr: [] }, atoms: [], highlight: [] };
  var nmr = data.spectra.nmr;
  let labels = getLabels(nmredata.ASSIGNMENT);
  labels = addDiaIDtoLabels(labels, moleculeAndMap);
  for (let key in labels) {
    let diaID = labels[key].diaID;
    data.atoms[diaID] = labels[key].position;
    data.highlight.push(diaID);
  }
  for (let tag in nmredata) {
    if (!tag.toLowerCase().match(/1d/s)) continue;
    let frequencyLine = nmredata[tag].data.find((e) => e.value.key === 'Larmor');
    let nucleus = getNucleus(tag);
    let width = nucleus.match(/13C/) ? 0.1 : 0.02;
    let jcamp = getJcamp(nmredata[tag], options);
    let spectrum = {
      jcamp,
      range: [],
      nucleus,
      frequency: frequencyLine.value.value,
      experiment: '1d',
      headComment: nmredata[tag].headComment 
    };
    let ranges = spectrum.range;
    let rangeData = nmredata[tag].data.filter((e) => e.value.delta);
    rangeData.forEach((rangeD) => {//@TODO change to support several labels
      let { value, comment } = rangeD;
      let signalData = getSignalData(value, labels);
      signalData.pubAssignment.forEach(assignment => {
        let label = labels[assignment];
        if (!signalData.diaID) signalData.diaID = [];
        if (!label) return;        
        signalData.diaID = signalData.diaID.concat(label.diaID);
      });      
      let range = getRangeData(value, signalData, comment, width);
      ranges.push(range);
    });
    nmr.push(spectrum);
  }
  return data;
}

function getRangeData(rangeData, signal, comment, width) {//@TODO change for support range from tags
  let integral;
  let delta = rangeData.delta;
  let [from, to] = delta.match('-') ? delta.split('-') : [Number(delta) - width, Number(delta) + width];
  [from, to] = [Number(from).toFixed(3), Number(to).toFixed(3)];
  if (rangeData.nbAtoms) {
    integral = Number(rangeData.nbAtoms);
  } else if (rangeData.pubIntegral) {
    integral = Number(rangeData.pubIntegral);
  }
  return { from, to, signal: [signal], comment }
}

function getJcamp(tag, options) {
  let { spectra, root } = options;
  let locationLine = tag.data.find((e) => e.value.key === 'Spectrum_Location');
  let path = root + locationLine.value.value.replace(/file\:/s, '');
  let jcamp = spectra.find((e) => e.filename === path);
  if (!jcamp) throw new Error(`There is not jcamp with path: ${path}`);
  return jcamp;
}

function getSignalData(rangeData, labels) {
  let result = {};
  let signalKeys = ['delta', 'nbAtoms', 'multiplicity', 'J', 'pubAssignment'];
  signalKeys.forEach((key) => {
    let data = rangeData[key];
    if (data) result[key] = data;
  });
  let needJdiaID = false;
  if (result.J) {
    needJdiaID = result.J.some((j) => {
      return Object.keys(j).some((e) => e === 'label');
    });
  }
  if (needJdiaID) {
    result.J.forEach((j, i, arr) => {
      if (j.label) {
        let label = labels[j.label];
        if (label) arr[i].diaID = label.diaID;
      }
    });
  }
  return result;
}

function getNucleus(label) {
  let nucleus = [];
  let dimensions = label.match(/([0-9])\w_/s)[1];
  if (dimensions === '1') {
    nucleus = label.substring(3, label.length);
  } else if (dimensions === '2') {
    let data = label.substring(12, label.length).split('_');
    for (let i = 0; i < data.length; i += 2) nucleus.push(data[i]);
  }
  return nucleus;
}

function getLabels(content) {
  let data = content.data;
  let labels = {};
  data.forEach((assignment) => {
    let value = assignment.value;
    let atoms = value.atoms;
    let shift = value.shift;
    if (!labels[value.label]) {
      labels[value.label] = [];
    }
    labels[value.label] = { shift, atoms };
  });
  return labels;
}

function addDiaIDtoLabels(labels, moleculeWithMap) {
  let { molecule, map } = moleculeWithMap;
  // ADD HIDROGENS TO BE SURE, THE ORIGINAL POSITION IT IS MAP OBJECT
  molecule.addImplicitHydrogens();

  let connections = molecule.getAllPaths({ toLabel: 'H', maxLength: 1 });
  // parse each label to get the connectivity of Hidrogens

  for (let l in labels) {
    let label = labels[l];
    let atoms = label.atoms;
    label.position = [];
    if (atoms[0].toLowerCase().includes('h')) { //this is for implicit hidrogens
      let connectedTo = Number(atoms[0].toLowerCase().replace('h', '')) - 1;

      // map object has the original atom's possition in molfile
      connectedTo = map.indexOf(connectedTo);
      let connection = connections.find((c, i) => {
        if (c.fromAtoms.some((fa) => fa === connectedTo)) {
          connections.splice(i, 1);
          return true;
        }
      });
      label.position = connection.toAtoms;
    } else if (atoms[0].toLowerCase().match(/\w/s)) {
      atoms.forEach((a) => {
        // let p = map.indexOf(Number(a) - minLabels);
        let p = map.indexOf(Number(a) - 1);
        label.position.push(p);
      });
    }
  }

  let diaIDs = molecule.getDiastereotopicAtomIDs();

  for (let l in labels) {
    let diaID = [];
    labels[l].position.forEach((p) => {
      if (diaID.indexOf(diaIDs[p]) === -1) {
        diaID.push(diaIDs[p]);
      }
    });
    labels[l].diaID = diaID;
  }
  return labels;
}

class nmrRecord {
  constructor(nmrRecord) {
    if (!(nmrRecord instanceof Object)) {
      throw new Error('Cannot be called directly');
    }
    let { spectra, sdfFiles } = nmrRecord;
    this.spectra = spectra;
    this.sdfFiles = sdfFiles;
    this.activeElement = 0;
    this.nbSamples = sdfFiles.length;
    return this;
  }

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
    let version = parseFloat(sdfFile.molecules[0].NMREDATA_VERSION);
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
    let result = { name: this.sdfFiles[i].filename };
    let nmredataTags = this.getNMReDataTags(i);
    Object.keys(nmredataTags).forEach((tag, index) => {
      if (tag.match(/2D/)) return;
      if (!result[tag]) result[tag] = { data: [] };
      let tagData = result[tag];
      let dataSplited = nmredataTags[tag].split('\n');
      dataSplited.forEach((e) => {
        let content = e.replace(/\;.*/g, '');
        let comment = e.match('\;') ? e.replace(/.*\;+(.*)/g, '$1') : '';
        if (content.length === 0) { // may be a head comment. is it always true?
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

  getSpectraList(i = this.activeElement) {
    return this.spectra.map(e => e.filename);
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

  getActiveElement() {
    let sdfList = this.getSDFList();
    return sdfList[this.activeElement];
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

/**
 * Read nmr record file asynchronously
 * @param {*} zipData  data readed of zip file
 * @param {*} options
 * @return {} An Object with two properties folders and sdfFiles, folders has nmr spectra data, sdfFiles has all sdf files
 */
async function readNMRR(zipData, options = {}) { // @TODO: Be able to read from a path
  var zip = new jszip();
  return zip.loadAsync(zipData, { base64: true }).then(async (zipFiles) => {
    let sdfFiles = await getSDF(zipFiles, options);
    let folders = getSpectraFolders(zipFiles);
    let spectra = await convertSpectra(folders.brukerFolders, zipFiles, options);
    let jcamps = await processJcamp(folders.jcampFolders, zipFiles, options);
    spectra = spectra.concat(jcamps);
    return new nmrRecord({ sdfFiles, spectra });
  });
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
  });
  return { jcampFolders, brukerFolders };
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
      var root = pathFile.slice(0, pathFile.length - 1).join('/');
      let sdf = await zipFiles.file(file).async('string');
      let parserResult = parse(`${sdf}`, { mixedEOL: true });
      parserResult.filename = filename;
      parserResult.root = root !== '' ? `${root}/` : '';
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
        promises.push(currFiles[j].async('arraybuffer').then((r) => new iobuffer.IOBuffer(r))); // @TODO: check the error - file.setLittleEndian is not a function -
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
      return { filename: result[0], value: brukerconverter.convertFolder(brukerFiles, options) };
    });
  }
  return Promise.all(spectra);
}

async function processJcamp(folders, zipFiles, options) {
  var spectra = new Array(folders.length);
  for (let i = 0; i < folders.length; ++i) {
    let name = folders[i].name;
    let jcamp = await zipFiles.file(name).async('string');
    let value = jcampconverter.convert(jcamp, { keepSpectra: true, keepRecordsRegExp: /^.+$/, xy: true });
    spectra[i] = { filename: name, value };
  }
  return spectra;
}

const BINARY$1 = 1;
const TEXT$1 = 2;
const files$1 = {
  ser: BINARY$1,
  fid: BINARY$1,
  acqus: TEXT$1,
  acqu2s: TEXT$1,
  procs: TEXT$1,
  proc2s: TEXT$1,
  '1r': BINARY$1,
  '1i': BINARY$1,
  '2rr': BINARY$1
};

function readNMRRSync(path$1) {
  let zipData = zipper.sync.unzip(path.resolve(path$1)).memory();
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
  let folders = getSpectraFolders$1(zipFiles);
  let spectra = convertSpectraSync(folders.brukerFolders, zipFiles);
  let jcamps = processJcamp$1(folders.jcampFolders, zipFiles);
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
      return files$1[relativePath] ? true : false;
    });
    var brukerFiles = {};
    if (folderName.indexOf('pdata') >= 0) {
      brukerFiles.acqus = zip.file(folderName.replace(/pdata\/[0-9]\//, 'acqus')).asText();
    }
    for (var j = 0; j < currFiles.length; ++j) {
      var idx = currFiles[j].name.lastIndexOf('/');
      var name = currFiles[j].name.substr(idx + 1);
      if (files$1[name] === BINARY$1) {
        brukerFiles[name] = new iobuffer.IOBuffer(currFiles[j].asArrayBuffer());
      } else {
        brukerFiles[name] = currFiles[j].asText();
      }
    }
    spectra[i] = { filename: folderName, value: brukerconverter.convertFolder(brukerFiles, options) };
  }
  return spectra;
}

function getSpectraFolders$1(zipFiles) { // Folders should contain jcamp too
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

function processJcamp$1(folders, zipFiles, options) {
  var spectra = new Array(folders.length);
  for (let i = 0; i < folders.length; ++i) {
    let name = folders[i].name;
    let jcamp = zipFiles.file(name).asText();
    let value = jcampconverter.convert(jcamp, { keepSpectra: true, keepRecordsRegExp: /^.+$/, xy: true });
    spectra[i] = { filename: name, value };
  }
  return spectra;
}

exports.readNMRR = readNMRR;
exports.readNMRRSync = readNMRRSync;
