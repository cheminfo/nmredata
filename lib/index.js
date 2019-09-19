'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var jszip = _interopDefault(require('jszip'));
require('zip-local');
var iobuffer = require('iobuffer');
require('path');
var brukerconverter = require('brukerconverter');
var OCLfull = require('openchemlib-extended');

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

// export function readZipFileSync(path) {
//     let zipData = zipper.sync.unzip(resolve(path)).memory();
//     let zipFiles = zipData.unzipped_file;
//     //obtain sdf files
//     let sdfFiles = [];
//     for (let file in zipFiles.files) {
//         let pathFile = file.split('/');
//         if (pathFile[pathFile.length - 1].match(/^[^\.].+sdf$/)) {
//             var filename = pathFile[pathFile.length - 1].replace(/\.sdf/, '');
//             let sdf = zipData.read(file, 'text');
//             let parserResult = parse(sdf + '', {mixedEOL: true});
//             parserResult.filename = filename;
//             sdfFiles.push(parserResult);
//         }
//     }
//     let folders = getSpectraFolders(zipFiles);
//     let spectra = convertSpectraSync(folders, zipFiles);
//     return {sdfFiles, spectra}
// }

/**
 * Read nmr record file asynchronously
 * @param {*} zipData  data readed of zip file  
 * @param {*} options 
 * @return {} An Object with two properties folders and sdfFiles, folders has nmr spectra data, sdfFiles has all sdf files
 */
async function readZipFile(zipData, options = {}) {//@TODO: Be able to read from a path
    var zip = new jszip();
    return zip.loadAsync(zipData, {base64: true}).then(async (zipFiles) => {
      let sdfFiles = await getSDF(zipFiles, options);
      let folders = getSpectraFolders(zipFiles);
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
            promises.push(currFiles[j].async('arraybuffer').then(r => new iobuffer.IOBuffer(r))); //@TODO: check the error - file.setLittleEndian is not a function -
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

function parse1DSignal(content, labels) {
    let signal = {};
    content = content.replace(/ /g, '');
    content = content.replace(/,([0-9])/g, ':$1');
    let data = content.split(',');
    data.forEach((d) => {
        d = d.toLowerCase();
        let value = d.replace(/^.*=/, '');
        let key = d.replace(/[=].*/, '');
        if (value === key) {
            signal.delta = value;
        } else {
            signal[choseKey(key)] = key === 'j' ? getCoupling(value) : value;
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
            key= 'multiplicity';
            break
        case 'l':
            key= 'pubAssignment';
            break
        case 'n':
            key= 'nbAtoms';
            break
        case 'e':
            key= 'pubIntegral';
            break
    }
    return key;
}
function getCoupling(d) {
    let jCoupling = [];
    d = d.split(':');
    d.forEach((c) => {
        let toValue = c.indexOf('(');
        var value = Number(c.substring(0, toValue));
        var withIt = c.substring(toValue + 1, c.length - 1);
        jCoupling.push({coupling: value, diaID: withIt});
    });
    return jCoupling;
}

function processContent(content, options) {
    let {tag} = options;
    let result;
    let processor = resultType(tag);
    let matchEqual = content.match(/=/g);
    if (!matchEqual && !content.match(',')) {
        result = content;
    } else if (matchEqual && matchEqual.length === 1) {
        result = propertyLinesProcessor(content);
    }else {
        result = processor(content, options);
    }
    return result;
}

function resultType(tag) {
    let processor;
    switch (tag.toLowerCase()) {
        case 'id':  //it has property lines
            processor = propertyLinesProcessor;
            break;
        case '1d_1h': //it has item list
            processor = parse1DSignal;
            break;
        case 'assignment': //it has item list
        case 'signals':
            processor = processAssignment;
            break;
        case 'j':
            processor = processAssignment; //@TODO change it
            break;
        case 'version':
        case 'solvent':
        case 'temperature':
        case 'level':
            break
    }
    return processor;
}

function propertyLinesProcessor(content, options) {
    let value = content.replace(/^.*=/, '');
    let key = content.replace(/[=].*/, '');
    return {key, value};
}

function processAssignment(content) {
    content = content.replace(/ /g, '');
    content = content.split(',');
    let label = content[0].toLowerCase();
    let shift = content.slice(1, 2);//Be able to know when the shift published or not
    let atoms = content.slice(2); 
    return {label, shift, atoms};
}

function nmredataToSampleEln(nmredata, spectra, molecule) {
    var data = {molfile: '', spectra: {nmr: []}, atoms: [], highlight: []};
    var nmr = data.spectra.nmr;
    let labels = getLabels(nmredata['ASSIGNMENT']);
    labels = addDiaIDtoLabels(labels, molecule);
    for (let key in labels) {
        let diaID = labels[key].diaID;
        data.atoms[diaID] = labels[key].position;
        data.highlight.push(diaID);
    }
    for (let tag in nmredata) {
        if (!tag.toLowerCase().match(/1d/s)) continue;
        let jcamp = getJcamp(nmredata[tag], spectra);
        let spectrum = {jcamp, range: [], experiment: '1d', headComment: nmredata[tag].headComment};
        let ranges = spectrum.range;
        let rangeData = nmredata[tag].data.filter(e => e.value.delta);
        rangeData.forEach(rangeD => {
            let {value, comment} = rangeD;
            let signalData = getSignalData(value);
            let range = getRangeData(value);
            let from = Number(signalData.delta) - 0.01;
            let to = Number(signalData.delta) + 0.01;
            ranges.push({from: from.toFixed(3), to: to.toFixed(3), signal: signalData, comment});
        });
        nmr.push(spectrum);
    }
    return data;
}

function getJcamp(tag, spectra) {
    let locationLine = tag.data.find(e => e.value.key === 'Spectrum_Location');
    let path = locationLine.value.value.replace(/file\:/s, '');
    let jcamp = spectra.find(e => e.filename === path);
    if (!jcamp) throw new Error('There is not jcamp with path: ' + path);
    return jcamp;
}

function getRangeData(rangeData) {
    let integral;
    let delta = Number(rangeData['delta']);
    if (rangeData['nbAtoms']) {
        integral = Number(rangeData['nbAtoms']);
    } else if (rangeData['pubIntegral']) {
        integral = Number(rangeData['pubIntegral']);
    }
}
function getSignalData(rangeData) {
    let result = {};
    let signalKeys = ['delta', 'nbAtoms', 'multiplicity', 'J', 'pubAssignment'];
    signalKeys.forEach(key => {
        let data = rangeData[key];
        if (data) result[key] = data;
    });
    return result;
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
        labels[value.label].push({shift, atoms});
    });
    return labels;
  }

  function addDiaIDtoLabels(labels, moleculeWithMap) {
      let {molecule, map} = moleculeWithMap;
    //ADD HIDROGENS TO BE SURE, THE ORIGINAL POSITION IT IS MAP OBJECT
    molecule.addImplicitHydrogens();
    
    let connections = molecule.getAllPaths({toLabel: 'H', maxLength: 1});
    // parse each label to get the connectivity of Hidrogens
    
    let minLabels = getMinLabel(labels);
    for (let l in labels) {
        let label = labels[l];
        let atoms = label[0].atoms;
        label.position = [];
        if (atoms[0].toLowerCase().includes('h')) {
            let connectedTo = Number(atoms[0].toLowerCase().replace('h', '')) - minLabels;
            
            //map object has the original atom's possition in molfile
            connectedTo = map.indexOf(connectedTo);
            let connection = connections.find((c, i) => {
                if (c.fromAtoms.some((fa) => fa === connectedTo)) {
                    connections.splice(i, 1);
                    return true;
                }
            });
            label.position = connection.toAtoms;
        } else if (atoms[0].toLowerCase().match(/\w/s)) {
            atoms.forEach(a => {
                let p = map.indexOf(Number(a) - minLabels);
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

  function getMinLabel(labels) {
    let min = Number.MAX_SAFE_INTEGER;
    for (let l in labels) {
        let label = labels[l];
        label[0].atoms.forEach((p) => {
            let pt = Number(p.replace(/[a-z]/g, ''));
            if (pt < min) min = pt;
        });
    }
    return min;
  }

// import {readZipFileSync, readZipFile} from './reader/readZip';

class nmrRecord {
  constructor(nmrRecord) {
    if (!nmrRecord instanceof Object) {
      throw new Error('Cannot be called directly');
    }
    let {spectra, sdfFiles} = nmrRecord;
    this.spectra = spectra;
    this.sdfFiles = sdfFiles;
    this.activeElement = 0;
    this.nbSamples = sdfFiles.length;
    return this;
  }

  static async read(nmrRecord) {
    let data = await readZipFile(nmrRecord);
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

  getNMReDATAtags(i = this.activeElement) {
    i = this.checkIndex(i);
    let nmredataTags = {};
    let sdfFile = this.sdfFiles[i];
    let version = parseFloat(sdfFile.molecules[0]['NMREDATA_VERSION']);

    let toReplace = version > 1 ? [new RegExp(/\\\n*/g), '\n'] : [];
    sdfFile.labels.forEach((tag) => {
      if (tag.toLowerCase().match('nmredata')) {

        let key = tag.replace(/NMREDATA\_/, '');
        let data = version > 1 ? sdfFile.molecules[0][tag].replace(/\n*/g, '') : sdfFile.molecules[0][tag];
        data = sdfFile.molecules[0][tag].replace(toReplace[0], toReplace[1]);
        nmredataTags[key] = data;
      }
    });
    return nmredataTags;
  }

  getNMReData(i = this.activeElement) {
    i = this.checkIndex(i);
    let result = {name: this.sdfFiles[i].filename};
    let nmredataTags = this.getNMReDATAtags(i);
    Object.keys(nmredataTags).forEach((tag, index) => {
      if (!result[tag]) result[tag] = {data: []};
      let tagData = result[tag];
      let dataSplited = nmredataTags[tag].split('\n');
      dataSplited.forEach(e => {
        let content = e.replace(/\;.*/g, '');
        let comment = e.match('\;') ? e.replace(/.*\;+(.*)/g, '$1') : '';
        if (content.length === 0) { // may be a head comment. is it always true?
          if (!tagData.headComment) tagData.headComment = []; // should this be array for several head comments?
          tagData.headComment.push(comment);
          return
        } 
        let value = processContent(content, {tag: tag});
        tagData.data.push({comment, value});
        
      });
    });
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
    });
    return allTags;
  }

  getSDFList() {
    let sdfFiles = this.sdfFiles;
    return sdfFiles.map((sdf) => sdf.filename);
  }

  toJSON(i = this.activeElement) {
    let nmredata = this.getNMReData(i);
    let molecule = this.getMoleculeAndMap(i);
    return nmredataToSampleEln(nmredata, this.spectra, molecule);
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

  // here: loop testing all .sdf files in the zip_object 
  // As an option ig should explore subfolders
  // When the zip is an NMReDATA record, it should find the file
  // compound1.dsf in the root of the zip file
  // Important note: when more than one compound is assiged to
  // the spectrum (see glucose where we have alpha and beta.
  // this function should get each .sdf file separately...) 
  // one coumpound, should get compound2.sdf...
  // to start we could skip the loop and wire "compound1.sdf"
  



  // .sdf files may include multiple structures... each has has its assiciated tags...
  // loop over structures in a given .sdf file. We may have two when there is a flat and a 3D structures...

// let molblock = currentSDFfile.getmol(loop);// replace with  existing modults to get molblock...
// let all_tags = currentSDFfile.getNMReDATAtags(loop);// replace with existing module to read SDF tags....
// let nmredata_tags = all_tags.getNMReDATAtags();// just keep the tags including "NMEDATA in the tag name"
  //maybe it is faster if we directly read only the tags with "NMREDATA" in the tag name... is it possible?

// if (molblock.is2D) { // test if the mol is 2d (see the nmredata/wiki page..??)
//     structures.d2.molblok=molblock;

//     structures.d2.label_to_atom_table=make_list_refs_atom_to_NMRlabel(nmredata_tags.assignment);
//     //if the .assignment does not exist, don't complain... it can be created and added !? but the list is empty
// }

//     if molblock.is3d { 
//       structures.d3.molblok=molblock;
//       structures.d3.label_to_atom_table=make_list_refs_atom_to_NMRlabel(nmredata_tags.assignment);;
//     }
//      all_nmredata_tags=   nmredata_tags.addtags (all_sdf_tags);// fuse all NMReDATA tags found

//   //end of loop over structures in a given .sdf file
  
//   // to be included in a class "structures" 
//   structures.highlight_on("Ha");// will add the yellow shadow about the atoms Ha...
//   structures.highlight_off("Ha")

//   display(structures)//we may have one or two structures
  
//   let nmredata = getNMReDATA(nmredata_tags);
// // create a nmredata class...
//   nmredata.display('all content')// to be developped laters...

exports.nmrRecord = nmrRecord;
