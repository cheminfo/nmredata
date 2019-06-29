const { readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');

const readNmrRecord = require('./src/index');

console.log(readNmrRecord);
var zipData = readFileSync(resolve('testFiles/menthol_1D_1H_assigned_J.zip'), 'base64');

readNmrRecord(zipData).then((result) => {
  console.log(result);
  writeFileSync('nmredataToElnSample.json', JSON.stringify(result));
});
// fs.appendFileSync('data.json', JSON.stringify(toExport) + ',');
