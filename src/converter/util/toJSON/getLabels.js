export function getLabels(content = {}) {
  let labels = {};
  for (const assignment of content.data || []) {
    let { label, atoms, shift } = assignment.value;
    if (!labels[label]) {
      labels[label] = [];
    }
    labels[label] = { shift, atoms };
  }
  return labels;
}
