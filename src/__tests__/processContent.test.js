import { processContent } from '../processContent';

describe('processContent testing', () => {
  let dataLines = [
    'Larmor=500.13300078',
    'CorrType=HMBC',
    'Pulseprogram=hmbcetgpl3nd',
    'Spectrum_Location=file:dj_ca_2017_ernestin_EN4/15/pdata/1/',
    '3/H1',
  ];
  /*eslint-disable camelcase*/
  let shouldBe = [
    { larmor: '500.13300078' },
    { corrtype: 'HMBC' },
    { pulseprogram: 'hmbcetgpl3nd' },
    { spectrum_location: 'file:dj_ca_2017_ernestin_EN4/15/pdata/1/' },
    { delta: { y: ['3'], x: ['h1'] } },
  ];
  /*eslint-enable camelcase*/
  it('process 2D data lines', () => {
    for (let i = 0; i < shouldBe.length; i++) {
      let result = processContent(dataLines[i], {
        tag: '2D_13C_NJ_1H',
      });
      expect(result).toStrictEqual(shouldBe[i]);
    }
  });
});
