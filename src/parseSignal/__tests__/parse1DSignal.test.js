import { parse1DSignal } from '../parse1DSignal';

describe('parse1DSignal', () => {
  it('parse range', () => {
    let signal = '7.200-7.600, N=5, L=H-C1, H-C2, C-C4';
    let { assignment, integral, nbAtoms, delta } = parse1DSignal(signal);
    expect(delta).toStrictEqual('7.200-7.600');
    expect(nbAtoms).toBe('5');
    expect(assignment).toStrictEqual(['h-c1', 'h-c2', 'c-c4']);
    expect(integral).toBeUndefined();
  });

  it('parse signal with J assignment', () => {
    let signal =
      '3.4302, S=dddd, N=1, L=H4, E=28.9715, J=9.90(H3),4.80(OH),10.90(H5ax),4.50(H5eq)';
    let {
      assignment,
      integral,
      nbAtoms,
      delta,
      jCoupling,
      multiplicity,
    } = parse1DSignal(signal);
    expect(delta).toStrictEqual('3.4302');
    expect(nbAtoms).toBe('1');
    expect(assignment).toStrictEqual(['h4']);
    expect(jCoupling).toStrictEqual([
      { label: 'h3', coupling: 9.9 },
      { label: 'oh', coupling: 4.8 },
      { label: 'h5ax', coupling: 10.9 },
      { label: 'h5eq', coupling: 4.5 },
    ]);
    expect(integral).toBe('28.9715');
    expect(multiplicity).toBe('dddd');
  });
});
