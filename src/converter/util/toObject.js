export function toObject(data) {
  let result = {};
  for (let i = 0; i < data.length; i++) {
    let { key, value } = data[i];
    result[key] = value;
  }
  return result;
}
