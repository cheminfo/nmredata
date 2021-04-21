import { nmredata } from 'nmredata-data-test';

import { readNmrRecord } from '../../index';

describe('NMReDATA reading', () => {
  it('Test nmredata read async', async () => {
    let nr = await readNmrRecord(nmredata['menthol_1D_1H_assigned_J.zip'], {
      zipOptions: { base64: true },
    });
    let sdfFileList = nr.getSDFList();
    expect(6).toBe(sdfFileList.length);
    expect(sdfFileList[nr.activeElement]).toBe(sdfFileList[0]);
  });
});
