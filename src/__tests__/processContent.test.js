import { processContent } from '../processContent';

describe('processContent testing', () => {
  let dataLines = [
    'Larmor=500.13300078',
    'CorrType=HMBC',
    'Pulseprogram=hmbcetgpl3nd',
    'Spectrum_Location=file:dj_ca_2017_ernestin_EN4/15/pdata/1/',
    '3/H1',
  ];
  let shouldBe = [
    {
      key: 'Larmor',
      value: '500.13300078',
    },
    {
      key: 'CorrType',
      value: 'HMBC',
    },
    {
      key: 'Pulseprogram',
      value: 'hmbcetgpl3nd',
    },
    {
      key: 'Spectrum_Location',
      value: 'file:dj_ca_2017_ernestin_EN4/15/pdata/1/',
    },
    {
      key: 'delta',
      value: { x: ['3'], y: ['H1'] },
    },
  ];
  it('process 2D data lines', () => {
    for (let i = 0; i < shouldBe.length; i++) {
      let { key: shouldKey, value: shouldValue } = shouldBe[i];
      let { key, value } = processContent(dataLines[i], {
        tag: '2D_13C_NJ_1H',
      });
      // console.log(dataLines[i], key, value);
      expect(key).toStrictEqual(shouldKey);
      expect(value).toStrictEqual(shouldValue);
    }
  });
});
