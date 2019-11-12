import getPascal from '../getPascal';

describe('getPascal', () => {
  it('singlet', () => {
    let mult = 0;// singlet
    let spin = 0.5;// spin 1/2
    let outdata = getPascal(mult, spin);
    expect(outdata).toStrictEqual([1]);
  });
  it('doublet spin 1/2', () => {
    let mult = 1;
    let spin = 0.5;
    let outdata = getPascal(mult, spin);
    expect(outdata).toStrictEqual([1, 1]);
  });
  it('triplet spin 1/2', () => {
    let mult = 2;
    let spin = 0.5;
    let outdata = getPascal(mult, spin);
    expect(outdata).toStrictEqual([1, 2, 1]);
  });
  it('Quartet', () => {
    let mult = 3;
    let spin = 0.5;
    let outdata = getPascal(mult, spin);
    expect(outdata).toStrictEqual([1, 3, 3, 1]);
  });
  it('couplint to one spin 1', () => {
    let mult = 1;
    let spin = 1;
    let outdata = getPascal(mult, spin);
    expect(outdata).toStrictEqual([1, 1, 1]);
  });
  it('coupling to two spin 1', () => {
    let mult = 2;
    let spin = 1;
    let outdata = getPascal(mult, spin);
    expect(outdata).toStrictEqual([1, 2, 3, 2, 1]);
  });
  it('coupling to three spin 1', () => {
    let mult = 3;
    let spin = 1;
    let outdata = getPascal(mult, spin);
    expect(outdata).toStrictEqual([1, 3, 6, 7, 6, 3, 1]);
  });
});
