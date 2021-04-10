import { nmriumToNmredata } from '../nmriumToNmrRecord';

import bidimensional from './bidimensionalAssignment.json';
import data from './data.json';

describe('nmrium to NMReData', () => {
  it('1D assignment', () => {
    let result = nmriumToNmredata(data);
  });

  it('2D assignment', () => {
    let result = nmriumToNmredata(bidimensional);
  });
});
