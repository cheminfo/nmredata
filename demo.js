const { readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');
const { nmrRecord } = require('./lib/index');

var zipData = readFileSync(resolve('testFiles/menthol_1D_1H_assigned_J.zip'), 'base64');

nmrRecord.fromZipFile(zipData).then((record) => {
  // record has all sdf files and folder inside of nmrRecord file
  let nbSDFFiles = record.nbSamples;
  let nmredata = record.getNMReData();
  let allTags = record.getAllTags();
  let stringOfNMReDATATags = record.getNMReDATAtags();

  //you can get the information of each sdf file 
  for (let i = 0; i < record.nbSamples; i++) {
    let nmredata = record.getNMReData(i)
    let molfile = record.getNMReData(i);
  }
});

