export function getJcamp(tag, options) {
  let { zip, root } = options;
  let locationLine = tag.data.find((e) => e.value.jcamp_location);

  if (!locationLine) {
    new Error(`There is not spectrum for ${tag}`);
    return;
  }

  let relativePath = locationLine.value.jcamp_location;
  let pathJcamp = root + relativePath.replace(/file:/s, '');
  if (!zip.file(pathJcamp)) {
    new Error(`There is not jcamp with path: ${pathJcamp}`);
    return;
  }
  return zip.file(pathJcamp).async('string');
}
