import { describe, expect, it } from 'vitest';

import { parse2DSignal } from '../parse2DSignal';

let signalWithCoupling = 'A/X, Ja=5, J1=4(M), 6.1(K), J2=2(M), 3.1(K)';

describe('parse2DSignal', () => {
  it('2D signal with coupling', () => {
    let { delta, activeCoupling, f1Coupling, f2Coupling } =
      parse2DSignal(signalWithCoupling);
    expect(delta).toStrictEqual({ x: ['x'], y: ['a'] });
    expect(activeCoupling).toStrictEqual([{ coupling: 5 }]);
    expect(f1Coupling).toStrictEqual([
      { label: 'm', coupling: 4 },
      { label: 'k', coupling: 6.1 },
    ]);
    expect(f2Coupling).toStrictEqual([
      { label: 'm', coupling: 2 },
      { label: 'k', coupling: 3.1 },
    ]);
  });
});
