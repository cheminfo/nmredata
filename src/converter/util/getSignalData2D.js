const signalKeys = ['intensity', 'volume', 'activeCoupling'];
const concept = { x: ['f1Width', 'f1Coupling'], y: ['f2Width', 'f2Coupling'] };

export function getSignalData2D(data, labels) {
  let result = {};
  signalKeys.forEach((key) => {
    if (data[key]) result[key] = data[key];
  });
  //check if the xLabel and yLabel are labels
  for (let axis of ['x', 'y']) {
    let axisLabels = data[`${axis}Label`];
    for (let label of axisLabels) {
      if (labels[label]) {
        if (!result[axis].assignment) result[axis].assignment = [];
        result[axis].assignment.push(labels[label]);
      } else {
        result[axis].delta = Number(label);
      }
    }
    for (let key of concept[axis]) {
      if (data[key]) {
        let newKey = key.toLowerCase().replace(/f\w(\w+)/, '$1');
        result[axis][newKey] = data[key];
      }
    }
  }
  return result;
}
