const signalKeys = [
  'delta',
  'nbAtoms',
  'multiplicity',
  'jCoupling',
  'assignment',
];

export function getSignalData1D(data, labels) {
  let result = {};
  signalKeys.forEach((key) => {
    let value = data[key];
    if (value) result[key] = value;
  });

  let { nbAtoms, integral } = data;
  result.integral = integral
    ? Number(integral)
    : nbAtoms
    ? Number(nbAtoms)
    : null;

  let needJdiaID = false;
  if (result.jCoupling) {
    needJdiaID = result.jCoupling.some((j) => {
      return Object.keys(j).some((e) => e === 'label');
    });
  }
  if (needJdiaID) {
    result.jCoupling.forEach((j, i, arr) => {
      if (j.label) {
        let label = labels[j.label];
        if (label) arr[i].diaID = label.diaID;
      }
    });
  }
  return result;
}
