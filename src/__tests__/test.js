import { readFileSync } from 'fs';
import { resolve } from 'path';
import {nmrRecord} from '../index';

describe('NMReDATA reading', () => {
  var zipData = readFileSync(resolve('testFiles/menthol_1D_1H_assigned_J.zip'), 'base64');
  it('Test nmredata read async', async () => {
    var nr = await nmrRecord.read(zipData);
    var sdfFileList = nr.getSDFList();
    expect(6).toBe(sdfFileList.length);
    expect(sdfFileList[nr.activeElement]).toBe(sdfFileList[0]);
  });
  it('Test nmredata read sync', async () => {
    var nr = nmrRecord.readSync(resolve('testFiles/menthol_1D_1H_assigned_J.zip'));
    var sdfFileList = nr.getSDFList();
    expect(6).toBe(sdfFileList.length);
    expect(sdfFileList[nr.activeElement]).toBe(sdfFileList[0]);
  });
});
