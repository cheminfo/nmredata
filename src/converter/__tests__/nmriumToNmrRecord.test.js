import { nmriumToNmrRecord } from '../nmriumToNmrRecord';

import bidimensional from './bidimensionalAssignment.json';
import data from './data.json';

describe('nmrium to NMReData', () => {
  it('1D assignment', () => {
    let nmrRecord = nmriumToNmrRecord(data);
  });

  it('2D assignment', () => {
    let result = nmriumToNmrRecord(bidimensional);
  });
});
