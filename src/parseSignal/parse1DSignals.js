export function parse1DSignal(content) {
  let signal = {};
  content = content.replace(/ /g, '');
  content = content.replace(/[l=] /g, '');
  content = content.replace(/,(\w=)/g, ':$1');
  let data = content.split(':');
  data.forEach((d) => {
    d = d.toLowerCase();
    let value = d.replace(/^.*=/, '');
    let key = d.replace(/[=].*/, '');
    if (parseFloat(key)) {
      signal.delta = value;
    } else {
      signal[chooseKey(key)] = choseProcess(value, key);
    }
  });
  return signal;
}

function chooseKey(entry) {
  switch (entry) {
    case 'j':
      return 'J';
    case 's':
      return 'multiplicity';
    case 'l':
      return 'pubAssignment';
    case 'n':
      return 'nbAtoms';
    case 'e':
    case 'i':
      return 'pubIntegral';
    default:
      return '';
  }
}

function choseProcess(d, key) {
  switch (key) {
    case 'l':
      return getPubAssignment(d);
    case 'j':
      return getCoupling(d);
    default:
      return d;
  }
}

function getPubAssignment(d) {
  return d.replace(/\s*/g, '').split(',');
}

function getCoupling(d) {
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
