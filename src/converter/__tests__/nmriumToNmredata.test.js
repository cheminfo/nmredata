import data from './data.json';

import { nmriumToNmredata } from '../nmriumToNmredata';
describe('nmrium to NMReData', () => {
    it('1D assignment', () => {
        let result = nmriumToNmredata(data);
    });
})