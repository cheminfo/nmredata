import { NmrRecord } from '../../NmrRecord';
import { readNmrRecord } from '../../reader/readNmrRecord';
import { nmriumToNmrRecord } from '../nmriumToNmrRecord';

import data from './data.json';

describe.skip('nmrium to NMReData', () => {
  it('1D assignment', async () => {
    let nmrRecordZip = nmriumToNmrRecord(data);
    let nmrRecord = await readNmrRecord(nmrRecordZip);
    expect(nmrRecord instanceof NmrRecord).toBe(true);
  });
});
