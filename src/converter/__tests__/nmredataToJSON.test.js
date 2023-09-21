import { getData } from 'nmredata-data-test';

import { readNmrRecord } from '../../reader/readNmrRecord';

describe('NMReData to nmrium', () => {
  it('1D assignment', async () => {
    let nmrRecord = await readNmrRecord(
      await getData('menthol_1D_1H_assigned_J.zip'),
    );
    let jsonData = await nmrRecord.toJSON(2);
    let { source, signals, nucleus, frequency, experiment } =
      jsonData.spectra[0];

    expect(signals).toHaveLength(14);
    expect(frequency).toBe('500.133088507');
    expect(nucleus).toBe('1H');
    expect(experiment).toBe('zg30');

    expect(
      source.file[0].fileCollection.files.map((file) => file.relativePath),
    ).toStrictEqual([
      'AN-menthol/10/uxnmr.par',
      'AN-menthol/10/prosol_History',
      'AN-menthol/10/pulseprogram',
      'AN-menthol/10/precom.output',
      'AN-menthol/10/format.temp',
      'AN-menthol/10/audita.txt',
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
      'AN-menthol/10/pdata/1/thumb.png',
      'AN-menthol/10/fq1list',
      'AN-menthol/10/fid',
      'AN-menthol/10/shimvalues',
      'AN-menthol/10/uxnmr.info',
      'AN-menthol/10/stanprogram3577',
      'AN-menthol/10/scon2',
      'AN-menthol/10/acqu',
      'AN-menthol/10/acqus',
      'AN-menthol/10/specpar',
    ]);
  });
});
