import { readFileSync } from 'fs';
import { resolve } from 'path';

import { nmredata } from '../index';


console.log(nmredata);
describe('test myModule', () => {
  it('should return 42', () => {
    var zipData = readFileSync(resolve('testFiles/menthol_1D_1H_assigned_J.zip'), 'base64');
    nmredata.readNmrRecord(zipData);
    expect(true).toBe(true);
  });
});
