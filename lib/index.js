'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var jszip = _interopDefault(require('jszip'));
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

function parse1DSignal(content, labels) {
    let signal = {};
    content = content.replace(/ /g, '');
    content = content.replace(/,([0-9])/g, ':$1');
    // console.log(content)
    let data = content.split(',');
    data.forEach((d) => {
        d = d.toLowerCase();
        // console.log('---- this is d\n',d)
        let value = d.replace(/^.*=/, '');
        let key = d.replace(/[=].*/, '');
        if (value === key) {
            signal.delta = value;
        } else {
            signal[choseKey(key)] = value === 'j' ? getCoupling(value) : value;
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
            key= 'label';
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
//   function parse1DSignals(content, labels) {
//     var eol = '\n'; //@TODO
//     let signals = content.split(eol);
//     var spectrum = {range: [], experiment: '1d'};
//     var range = spectrum.range;
//     for (let i = 0; i < signals.length; i++) {
//         if (signals[i].startsWith(';')) continue; //It should change to preserve all data
//         var signal = {};
//         let indexComment = signals[i].indexOf(';');
//         if (indexComment > -1) signals[i] = signals[i].substring(0,indexComment);
//         signals[i] = signals[i].replace(/ /g, '');
//         signals[i] = signals[i].replace(/,([0-9])/g, ':$1');
//         let data = signals[i].split(',');
//         data.forEach((d) => {
//             d = d.toLowerCase();
//             // console.log('---- this is d\n',d)
//             if (d[0] === 'j') {
//                 signal.J = getCoupling(d);
//             } else if (d.match('s=')) {
//                 signal.multiplicity = d.replace(/s=/s, '');
//             } else if (d.match(/^l=/s)) {
//                 let label = d.replace(/l=/s, '').toLowerCase();
//                 if (labels[labels]=== undefined) return;
//                 let atoms = labels[label].atoms;
//                 signal.nbAtoms = atoms.length;
//                 signal.diaID = labels[label].diaID;
//             } else if (d[0].match(/[0-9]/)) {
//                 signal.delta = Number(d);
//             } else if (d.match('larmor')) {
//                 spectrum.frequency = Number(d.replace('larmor=',''));
//             } else if (d.match('spectrum_location')) {
//                 spectrum.spectraLocation = d.replace('spectrum_location=', '')
//             } else if (d.match('sequence')) {
//                 spectrum.experiment = d.replace('sequence=', '').toUpperCase();
//             }
//         });
//         if (Object.keys(signal).length > 0) {
//             signal = [signal];
//             range.push({
//                 from: signal[0].delta, 
//                 to: signal[0].delta,
//                 signal
//             });
//         }
//     }
//     return spectrum;
//   }

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

// import {getNMReDATAtags} from './'; //to delete
// import * as getNMReData from 'getNMReData';

class nmrRecord {
  constructor(nmrRecord) {
    if (!nmrRecord instanceof Object) {
      throw new Error('Cannot be called directly');
    }
    let {folders, sdfFiles} = nmrRecord;
    this.folders = folders;
    this.sdfFiles = sdfFiles;
    this.activeElement = 0;
    this.nbSamples = sdfFiles.length;
    return this;
  }

  static async fromZipFile(nmrRecord) {
    let data = await readNmrRecord(nmrRecord);
    return new this(data);
  }

  getMol(i = this.activeElement) {
    let parserResult = this.sdfFiles[i];
    return parserResult.molecules[0].molfile;
  }

  getMoleculeAndMap(i = this.activeElement) {
    let molfile = this.getMol(i);
    return OCLfull.Molecule.fromMolfileWithAtomMap(molfile);
  }

  getNMReDATAtags(i = this.activeElement) {
    let nmredataTags = {};
    let sdfFile = this.sdfFiles[i];
    let version = parseFloat(sdfFile.molecules[0]['NMREDATA_VERSION']);
    let toReplace = version > 1 ? [new RegExp(/\\\n*/g), '\n'] : [];
    sdfFile.labels.forEach((tag) => {
      if (tag.toLowerCase().match('nmredata')) {
        let key = tag.replace(/NMREDATA\_/, '');
        let data = sdfFile.molecules[0][tag].replace(toReplace[0], toReplace[1]);
        nmredataTags[key] = data;
      }
    });
    return nmredataTags;
  }

  getNMReData(i = this.activeElement) {
    console.log(this.sdfFiles[i].filename);
    let result = {name: this.sdfFiles[i].filename};
    let nmredataTags = this.getNMReDATAtags(i);
    // console.log(nmredataTags)
    Object.keys(nmredataTags).forEach((tag, index) => {
      console.log('------' + tag);
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
        // console.log(value)
        tagData.data.push({comment, value});
        
      });
    });
    return result;
  }

  getFileName(i = this.activeElement) {
    let sdf =this.sdfFiles[i];

  }
  getAllTags(i = this.activeElement) {
    let allTags = {};
    let sdfFile = this.sdfFiles[i];
    sdfFile.labels.forEach((tag) => {
      allTags[tag] = sdfFile.molecules[0][tag];
    });
    return allTags;
  }

  toJSON(i = this.activeElement) {
    
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
    let sdfFiles = await getSDF(zipFiles, options);    var folders = zipFiles.filter(function (relativePath, file) {
        if(relativePath.indexOf("ser")>=0||relativePath.indexOf("fid")>=0
            ||relativePath.indexOf("1r")>=0||relativePath.indexOf("2rr")>=0) {
            return true;
        }
        return false;
    });
    return {folders, sdfFiles}
  })
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
