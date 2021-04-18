import { write, writeFileSync } from 'fs';
import Jszip from 'jszip';

import { nmredata } from 'nmredata-data-test';

import { readNmrRecord } from '../../reader/readNmrRecord';

describe('NMReData to nmrium', () => {
  it('1D assignment', async () => {
    let nmrRecord = await readNmrRecord(
      nmredata['menthol_1D_1H_assigned_J.zip'],
    );
    let jsonData = await nmrRecord.toJSON(2);
    let {
      source,
      signals,
      nucleus,
      frequency,
      experiment,
    } = jsonData.spectra[0];

    expect(signals).toHaveLength(14);
    expect(frequency).toBe('500.133088507');
    expect(nucleus).toBe('1H');
    expect(experiment).toBe('zg30');

    let jszip = Jszip();
    let zip = await jszip.loadAsync(source.zip, { base64: true });
    expect(Object.keys(zip.files)).toStrictEqual([
      'AN-menthol/',
      'AN-menthol/10/',
      'AN-menthol/10/pdata/',
      'AN-menthol/10/pdata/1/',
      'AN-menthol/10/pdata/1/proc',
      'AN-menthol/10/pdata/1/peaks',
      'AN-menthol/10/pdata/1/peakrng',
      'AN-menthol/10/pdata/1/peaklist.xml',
      'AN-menthol/10/pdata/1/hwcal.txt',
      'AN-menthol/10/pdata/1/title',
      'AN-menthol/10/pdata/1/parm.txt',
      'AN-menthol/10/pdata/1/auditp.txt',
      'AN-menthol/10/pdata/1/intrng',
      'AN-menthol/10/pdata/1/1r',
      'AN-menthol/10/pdata/1/1i',
      'AN-menthol/10/pdata/1/procs',
      'AN-menthol/10/pdata/1/outd',
      'AN-menthol/10/pdata/1/thumb.png'
    ]);
  });
});
