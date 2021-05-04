import { getCoupling } from './util/getCoupling';

const axisInOrder = ['x', 'y'];

export function parse2DSignal(content) {
  content = content.replace(/ /g, '');
  content = content.replace(/[l=] /g, '');
  content = content.replace(/,(\w+=)/g, ':$1');
  let data = content.split(':');

  let signal = getSignalWithDelta(data[0]);

  for (let i = 1; i < data.length; i++) {
    let { value, key } = getKeyAndValue(data[i]);
    signal[chooseKey(key)] = chooseProcess(value, key);
  }
  return signal;
}

function getSignalWithDelta(data) {
  let { value } = getKeyAndValue(data);

  let signal = { delta: {} };
  let correlation = value.split('/');
  for (let j = 0; j < correlation.length; j++) {
    let label = correlation[j].replace(/[(|)]/g, '').split(',');
    signal.delta[axisInOrder[j]] = Array.isArray(label) ? label : [label];
  }
  return signal;
}

function getKeyAndValue(data) {
  let datum = data.toLowerCase();
  return {
    value: datum.replace(/^.*=/, ''),
    key: datum.replace(/[=].*/, ''),
  };
}

function chooseProcess(value, key) {
  switch (key) {
    case 'ja':
    case 'j1':
    case 'j2':
      return getCoupling(value);
    default:
      return value;
  }
}

function chooseKey(key) {
  switch (key) {
    case 'ja':
      return 'activeCoupling';
    case 'j1':
      return 'f1Coupling';
    case 'j2':
      return 'f2Coupling';
    case 'i':
      return 'intensity';
    case 's':
      return 'volume';
    case 'w1':
      return 'f1Width';
    case 'w2':
      return 'f2Width';
    default:
      return key;
  }
}
