import jszip from 'jszip';
import {parse} from './parser/parseSDF';
import * as OCLfull from 'openchemlib-extended';
import {processContent} from './processor';
import {convertFolder} from 'brukerconverter';

export class nmrRecord {
  constructor(nmrRecord) {
    if (!nmrRecord instanceof Object) {
      throw new Error('Cannot be called directly');
    }
    let {spectra, sdfFiles} = nmrRecord;
    this.spectra = spectra;
    this.sdfFiles = sdfFiles;
    this.activeElement = 0;
    this.nbSamples = sdfFiles.length
    return this;
  }

  static async fromZipFile(nmrRecord) {
    let data = await readNmrRecord(nmrRecord)
    return new this(data);
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
          tagData.headComment.push(comment)
          return
        } 
        let value = processContent(content, {tag: tag});
        tagData.data.push({comment, value})
        
      })
    })
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
    })
    return allTags;
  }

  getSDFList() {
    let sdfFiles = this.sdfFiles;
    return sdfFiles.map((sdf) => sdf.filename);
  }

  toJSON(i = this.activeElement) {
    
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


/**
 * Read nmr record file asynchronously
 * @param {*} zipData  data readed of zip file  
 * @param {*} options 
 * @return {} An Object with two properties folders and sdfFiles, folders has nmr spectra data, sdfFiles has all sdf files
 */
async function readNmrRecord(zipData, options = {}) {
  var zip = new jszip();
  return zip.loadAsync(zipData, {base64: true}).then(async (zipFiles) => {
    let sdfFiles = await getSDF(zipFiles, options);
    let folders = zipFiles.filter((relativePath) => {
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
    let spectra = await convertSpectra(folders, zipFiles, options);
    return {spectra, sdfFiles}
  })
}

async function convertSpectra(folders, zipFiles, options) {
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

    