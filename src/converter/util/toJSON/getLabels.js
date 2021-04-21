export function getLabels(content) {
  let labels = {};
  content.data.forEach((assignment) => {
    let { label, atoms, shift } = assignment.value;
    if (!labels[label]) {
      labels[label] = [];
    }
    labels[label] = { shift, atoms };
  });
  return labels;
}
