import { writeFileSync } from 'fs';
import { resolve } from 'path';

import { readNmrRecordSync } from '../index';

let nmrRecordWithJcampFromSync = readNmrRecordSync(
  resolve('testFiles/generated.zip'),
);
let json = nmrRecordWithJcampFromSync.toJSON();
writeFileSync('generated.json', JSON.stringify(json));
