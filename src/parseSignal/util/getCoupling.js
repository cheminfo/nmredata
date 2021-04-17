export function getCoupling(d) {
  let jCoupling = [];
  d = d.replace(/,([0-9])/g, ':$1');
  d = d.split(':');
  d.forEach((c) => {
    let value;
    let withIt = '';
    let toValue = c.indexOf('(');
    if (toValue === -1) {
      value = Number(c);
      jCoupling.push({ coupling: value });
    } else {
      value = Number(c.substring(0, toValue));
      withIt = c.substring(toValue + 1, c.length - 1);
      jCoupling.push({ coupling: value, label: withIt });
    }
  });
  return jCoupling;
}
