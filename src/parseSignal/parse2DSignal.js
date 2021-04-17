export function parse2DSignal(content) {
  content = content.replace(/ /g, '');
  content = content.replace(/[l=] /g, '');
  content = content.replace(/,(\w+=)/g, ':$1');
  let data = content.split(':');
  console.log(data.slice());
  let signal = {};
  let { value, key } = getKeyAndValue(data[0]);
  let correlation = value.split('/');
  let atomLabels = new Array(correlation.length);
  for (let j = 0; j < correlation.length; j++) {
    let label = correlation[j].replace(/[\(|\)]/g, '').split(',');
    atomLabels[j] = Array.isArray(label) ? label : [label];
  }
  [signal.x, signal.y] = atomLabels;

  for (let i = 1; i < data.length; i++) {
    let { value, key } = getKeyAndValue(data[i]);
    signal[chooseKey(key)] = chooseProcess(value, key);
  }

  return signal;
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
  }
}

function getKeyAndValue(data) {
  let datum = data.toLowerCase();
  return {
    value: datum.replace(/^.*=/, ''),
    key: datum.replace(/[=].*/, ''),
  };
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

// for (let i = 0; i < signals.length; i++) {
//   if (signals[i].startsWith(';')) continue; // avoid the comments on the record
//   let signal = {};
//   let indexComment = signals[i].indexOf(';');
//   if (indexComment > -1) signals[i] = signals[i].substring(0, indexComment);
//   signals[i] = signals[i].replace(/ /g, '');
//   signals[i] = signals[i].replace(/,([0-9])/g, ':$1');
//   let data = signals[i].split(',');

// data.forEach((d) => {
//   if (d.toLowerCase().match('larmor')) {
//     spectrum.frequency = d.toLowerCase().replace('larmor=', '');
//   } else if (d.toLowerCase().match('cortype')) {
//     spectrum.experiment = d.toUpperCase().replace(/CORTYPE=/s, '');
//   } else if (d.toLowerCase().match('spectrum_location')) {
//     spectrum.spectraLocation = d
//       .toLowerCase()
//       .replace('spectrum_location=', '');
//   } else {
//     signal.pubAssignment = d;
//   }
// });
// if (Object.keys(signal).length > 0) zone.signal.push(signal);
// }
