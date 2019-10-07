const { readFileSync, writeFileSync, existsSync } = require('fs');
const { resolve } = require('path');
const nmrRecord  = require('./lib/index');
const argv = require('yargs').argv;

var zipData;
if (argv.optionalPath && existsSync(argv.optionalPath)) {
  zipData = readFileSync(resolve(argv.optionalPath), 'base64');
} else {
  zipData = readFileSync(resolve('testFiles/menthol_1D_1H_assigned_J.zip'), 'base64');
}

//reading asynchronously, 
nmrRecord.readNMRR(zipData).then((record) => {
  /**
   *  record has all sdf files and spectra data inside of nmrRecord file.
  */
  let nbSDFFiles = record.nbSamples;
  let sdfList = record.getSDFList(); // it's return ["wild_JCH_coupling","only_one_HH_coupling_in_Jtag","compound1.nmredata","compound1_with_jcamp.nmredata","with_char_10","compound1_special_labels.nmredata copy"]
  /**
   * if several sdf file exists
   *  the first readed is set as activeElement, it means that you don't need 
   *  to pass a filename for each operation on the same SDF file.
   *  It's possible to get or set (filename or index) an activeElement.
   */
  let activeElement = record.getActiveElement(); //should return 'wild_JCH_coupling'
  record.setActiveElement(sdfList[0]);

  /**
   * You can get the text of all tags of a specific sdf file (filename or index) with 
   * getNMReDataTags, it returns an object where each tag is a property 
   * with their value in text 
  **/
  let allTags = record.getNMReDataTags(); //return the tags of 'only_one_HH_coupling_in_Jtag'
  // you can get a specific tag 
  let solvent = allTags['SOLVENT']
  // To get one list with the current's tags
  let tagsList = Object.keys(allTags);
  /**
   *  It's possible to get nmredata of a specific sdf file (filename or index)
   *  as an object where each tag is a property containing an object with
   *  properties 'headComment' and 'data', the content of 'data' depend of tag's nature
   *  (e.g. the ASSIGNMENT tag has an array of objects with properties 'comment' and 'value')
   **/
  let nmredata = record.getNMReData();
  //console.log(nmredata)

  /**
   * you can get a JSON with a specific format ()
   */
  var json = record.toJSON();
  //console.log(json)
});
