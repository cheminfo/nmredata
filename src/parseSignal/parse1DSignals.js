export function parse1DSignal(content, labels) {
  let signal = {};
  content = content.replace(/ /g, '');
  content = content.replace(/[l=] /g, '')
  content = content.replace(/,(\w=)/g,':$1')
  console.log('this is content', content)
  let data = content.split(':');
  data.forEach((d) => {
    d = d.toLowerCase();
    let value = d.replace(/^.*=/, '');
    let key = d.replace(/[=].*/, '');
    console.log('value', value)
    if (parseFloat(key)) {
      signal.delta = value;
    } else {
      signal[choseKey(key)] = choseProcess(value, key);
    }
  });
  return signal;
}

function choseKey(entry) {
  let key = '';
  switch (entry) {
    case 'j':
      key = 'J';
      break;
    case 's':
      key = 'multiplicity';
      break;
    case 'l':
      key = 'pubAssignment';
      break;
    case 'n':
      key = 'nbAtoms';
      break;
    case 'e':
    case 'i':
      key = 'pubIntegral';
      break;
  }
  return key;
}

function choseProcess(d, key) {
  let result;
  switch (key) {
    case 'l':
      result = getPubAssignment(d);
      break;
    case 'j':
      result = getCoupling(d);
      break;
    default:
      result = d;
  }
  return result;
}

function getPubAssignment(d) {
  return d.replace(/\s*/g, '').split(',');
}

function getCoupling(d) {
  let jCoupling = [];
  d = d.replace(/,([0-9])/g, ':$1');
  d = d.split(':');
  d.forEach((c) => {
    let value; let
      withIt = '';
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
