import { nmriumToNmredata } from '../nmriumToNmredata';

import data from './data.json';
import bidimensional from './bidimensionalAssignment.json';

describe('nmrium to NMReData', () => {
  it('1D assignment', () => {
    let result = nmriumToNmredata(data);
  });

  it.only('2D assignment', () => {
    let result = nmriumToNmredata(bidimensional);
  });
});
