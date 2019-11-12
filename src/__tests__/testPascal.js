import getPascal from '../getPascal';

describe('getPascal', () => {
  it('singlet', () => {
    let outdata = getPascal(0, 0.5);
    // expect(spectrum.data).toBeCloseTo({
    expect(outdata).toStrictEqual([1]);
  });
});
