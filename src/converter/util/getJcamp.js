export function getJcamp(tag, options) {
  let { zip, root } = options;
  let jcampLocationLine = tag.data.find(
    (e) => e.value.key === 'Jcamp_location',
  );
  if (!jcampLocationLine) return;
  let pathJcamp = root + jcampLocationLine.value.value.replace(/file:/s, '');
  if (!zip.file(pathJcamp)) {
    new Error(`There is not jcamp with path: ${pathJcamp}`);
    return;
  }
  return zip.file(pathJcamp).async('string');
}
