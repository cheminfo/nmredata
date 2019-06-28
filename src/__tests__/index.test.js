import { readFileSync } from 'fs';
import { nmredata } from '../index';
import { resolve } from 'path';
console.log(nmredata)
describe('test myModule', () => {
  it('should return 42', () => {
    var zipData = readFileSync(resolve('testFiles/menthol_1D_1H_assigned_J.zip'), 'base64');
    nmredata.readNmrRecord(zipData);
    expect(true).toBe(true);
  });
});
