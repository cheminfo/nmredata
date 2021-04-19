export function getJcamp(tag, options) {
  let { zipFiles, root } = options;
  let locationLine = tag.data.find((e) => e.value.jcamp_location);

  if (!locationLine) {
    new Error(`There is not spectrum for ${tag}`);
    return;
  }

  let relativePath = locationLine.value.jcamp_location;
  let pathJcamp = root + relativePath.replace(/file:/s, '');
  if (!zipFiles[pathJcamp]) {
    new Error(`There is not jcamp with path: ${pathJcamp}`);
    return;
  }
  return zipFiles[pathJcamp].async('string');
}
