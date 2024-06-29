const signalKeys = ['delta', 'nbAtoms', 'multiplicity', 'jCoupling'];

export function getSignalData1D(data, labels) {
  let result = {};
  signalKeys.forEach((key) => {
    let value = data[key];
    if (value) result[key] = value;
  });

  let { nbAtoms, integration } = data;
  result.integration = integration
    ? Number(integration)
    : nbAtoms
      ? Number(nbAtoms)
      : null;

  if (data.assignment) {
    data.assignment.forEach((assignment) => {
      let label = labels[assignment];
      if (!result.diaIDs) result.diaIDs = [];
      if (!label || !label.diaIDs) return;
      result.diaIDs.push(...label.diaIDs);
    });
  }

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
        if (label && label.diaIDs) arr[i].diaIDs = label.diaIDs;
      }
    });
  }
  if (result.delta) result.delta = parseFloat(result.delta);
  return result;
}
