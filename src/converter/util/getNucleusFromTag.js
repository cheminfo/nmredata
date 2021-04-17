export function getNucleusFromTag(label) {
  let nucleus = [];
  let dimensions = label.match(/([0-9])\w_/s)[1];
  if (dimensions === '1') {
    nucleus = label.substring(3, label.length);
  } else if (dimensions === '2') {
    let data = label.substring(12, label.length).split('_');
    for (let i = 0; i < data.length; i += 2) nucleus.push(data[i]);
  }
  return nucleus;
}
