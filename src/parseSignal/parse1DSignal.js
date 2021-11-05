import { getCoupling } from './util/getCoupling';

export function parse1DSignal(content) {
  let signal = {};
  content = content.replace(/ /g, '');
  content = content.replace(/[l=] /g, '');
  content = content.replace(/,(\w=)/g, ':$1');
  let data = content.split(':');
  data.forEach((d, i) => {
    d = d.toLowerCase();
    let value = d.replace(/^.*=/, '');
    let key = d.replace(/[=].*/, '');
    if (parseFloat(key) && i === 0) {
      signal.delta = value;
    } else {
      signal[chooseKey(key)] = chooseProcess(value, key);
    }
  });
  return signal;
}

function chooseKey(entry) {
  switch (entry) {
    case 'j':
      return 'jCoupling';
    case 's':
      return 'multiplicity';
    case 'l':
      return 'assignment';
    case 'n':
      return 'nbAtoms';
    case 'e':
    case 'i':
      return 'integration';
    default:
      return '';
  }
}

function chooseProcess(d, key) {
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
