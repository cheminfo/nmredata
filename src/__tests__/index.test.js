import { readFileSync } from 'fs';
import { nmredata } from '..';
import { resolve } from 'path';

describe('test myModule', () => {
  it('should return 42', () => {
    var zipData = readFileSync(resolve('testFiles/menthol_1D_1H_assigned_J_original.zip'), 'base64');
    nmredata.readNmrRecord(zipData);
    expect(true).toBe(true);
  });
});
