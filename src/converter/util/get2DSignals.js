import { getCouplingObserved } from './getCouplingObserved';
import { getToFix } from './getToFix';

const isArray = Array.isArray;

export function get2DSignals(data, labels, options = {}) {
  let { prefix, nmrRecord } = options;
  let { byDiaID } = labels;
  let str = '';
  let nucleusRecorded = [];
  for (let spectrum of data) {
    if (spectrum.info.dimension < 2) continue;

    let { nucleus, experiment, pulseSequence } = spectrum.info;

    let couplingObserved = getCouplingObserved(experiment);
    if (experiment) prefix = `\n> 2D ${experiment} <NMREDATA_2D_`;
    let counter = 1;
    let subfix = '';
    nucleusRecorded.forEach((e) => {
      if (e === nucleus) counter++;
    });

    if (counter > 1) subfix = `#${counter}`;

    if (nucleus) {
      str += `${prefix}${nucleus[1]}_${couplingObserved}_${nucleus[0]}>`;
    }
    let toFix = getToFix(nucleus);

    nucleusRecorded.push(nucleus);
    str += `\nLarmor=${Number(spectrum.info.baseFrequency[0]).toFixed(2)}\\`;

    if (spectrum.source.jcamp) {
      let pathPrefix = 'jcamp_folder/1d/';
      nmrRecord.file(
        `${pathPrefix}'${spectrum.display.name}`,
        spectrum.source.jcamp,
      );
      str += `\nSpectrum_Jcamp=file:./${pathPrefix}${spectrum.display.name}\\`;
    }

    if (experiment) str += `\nCorType=${experiment} \\`;
    if (pulseSequence) str += `\nPulseProgram=${pulseSequence} \\`;

    let zones = spectrum.zones.values || [];
    for (let zone of zones) {
      let signals = zone.signal;
      for (let signal of signals) {
        let { x, y, peak } = signal;
        let xLabel = getAssignment(x, byDiaID, toFix[0]);
        let yLabel = getAssignment(y, byDiaID, toFix[1]);
        let intensity = Math.max(...peak.map((e) => e.z));
        str += `\n${xLabel}/${yLabel}, I=${intensity.toFixed(2)}\\`;
      }
    }
  }
  return str;
}

function getAssignment(axis, labels, toFix) {
  let { diaID, delta } = axis;
  if (diaID) {
    if (!isArray(diaID)) diaID = [diaID];
    if (diaID.length < 1) Number(delta).toFixed(toFix);
    let label = diaID.map((diaID) => labels[diaID].label).join(',');
    return diaID.length > 1 ? `(${label})` : label;
  }
  return Number(delta).toFixed(toFix);
}
