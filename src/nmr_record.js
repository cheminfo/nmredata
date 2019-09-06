// import {getNMReDATAtags} from './'; //to delete
// import {getNMReDATA} from './'; //to delete
import jszip from 'jszip';
import {parse} from './parser/parseSDF';
import * as OCLfull from 'openchemlib-extended';
// import * as getNMReData from 'getNMReData';

export class nmrRecord {
  constructor(nmrRecord) {
    if (!nmrRecord instanceof Object) {
      throw new Error('Cannot be called directly');
    }
    let {folders, sdfFiles} = nmrRecord
    this.folders = folders;
    this.sdfFiles = sdfFiles;
    this.activeElement = 0;
    return this;
  }

  static async fromZipFile(nmrRecord) {
    let data = await readNmrRecord(nmrRecord)
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
    let toReplace = version > 1 ? [new RegExp(/\\\n*/g), '\n'] : []
    // Object.keys(sdfFile.molecules[0]).map((tag) => { //should give the same result that the next line
    sdfFile.labels.forEach((tag) => {
      if (tag.toLowerCase().match('nmredata')) {
        let key = tag.replace(/NMREDATA\_/, '')
        let data = sdfFile.molecules[0][tag].replace(toReplace[0], toReplace[1]);
        nmredataTags[key] = data;
      }
    });
    return nmredataTags;
  }

  // getNMReData(i = this.activeElement) {
  //   let nmredataTags =  this.getNMReDATAtags(i);
  //   //not implemented
  // }

  getAllTags(i = this.activeElement) {
    let allTags = {};
    let sdfFile = this.sdfFiles[i];
    // Object.keys(sdfFile.molecules[0]).map((tag) => { //should give the same result that the next line
    sdfFile.labels.forEach((tag) => {
      if (tag.toLowerCase() !== 'molfile') {
        allTags[tag] = sdfFile.molecules[0][tag];
      }
    })
    return allTags;
  }

  toJSON(i = this.activeElement) {
    
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
    let sdfFiles = await getSDF(zipFiles, options);;
    var folders = zipFiles.filter(function (relativePath, file) {
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
          var sdfPathFile = [];
          if (file.indexOf('/') > -1) {
              let index = file.lastIndexOf('/');
              let tempPath = file.substring(0,index).toLowerCase().split('/');
              if (tempPath !== '.') sdfPathFile = tempPath;
          }
          let sdf = await zipFiles.file(file).async('string');
          // sdf = sdf.replace(/\\/g, '')
          // console.log(parse)
          let parserResult = parse(sdf + '', {mixedEOL: true});
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

    