const signalKeys = ['intensity', 'volume', 'activeCoupling'];
const concept = { x: ['f1Width', 'f1Coupling'], y: ['f2Width', 'f2Coupling'] };

export function getSignalData2D(data, labels) {
  let result = {};
  signalKeys.forEach((key) => {
    if (data[key]) result[key] = data[key];
  });
  //check if the xLabel and yLabel are labels
  for (let axis in data.delta) {
    if (!result[axis]) result[axis] = {};
    let axisLabels = data.delta[axis];
    for (let label of axisLabels) {
      if (labels[label]) {
        if (!result[axis].diaID) result[axis].diaID = [];
        result[axis].diaID.push(...labels[label].diaID);
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
