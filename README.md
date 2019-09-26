# nmredata parser
<p align="center">
  A tool for reading nmrRecords.
</p>
<p align="center">
  <img alt="NMReDATA" src="images/nmredataParser.png">
</p>

## Installation

`$ npm install nmredata`

## Usage

```js
// Synchronously, to be used locally
const nmredata = require('nmredata');

const path = 'pathToNMRRecordFile';
var currentNMRrecord = nmredata.readNMRRSync(path);
var json = currentNMRrecord.toJSON();

// Asynchronously, to be used in the browser or another node packages
const nmredata = require('nmredata');
const FS = require('fs');
const path = 'pathToNMRRecordFile'
var zipData = FS.readFileSync(path);
const cur_NMRrecord = nmredata.readNMRR(zipData).then(currentNMRrecord => {
  var json = currentNMRrecord.toJSON();
});

...

```

## License
  [MIT](./LICENSE)
  
