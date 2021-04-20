import { readNmrRecordSync } from '../../reader/readNmrRecordSync';
import { nmriumToNmrRecord } from '../nmriumToNmrRecord';

import bidimensional from './bidimensionalAssignment.json';
import data from './data.json';

describe('nmrium to NMReData', () => {
  it('1D assignment', () => {
    let nmrRecordZip = nmriumToNmrRecord(data);
    let nmrRecord = readNmrRecordSync(nmrRecordZip);
  });

  it('2D assignment', () => {
    let result = nmriumToNmrRecord(bidimensional);
  });
});
