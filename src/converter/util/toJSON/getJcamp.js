export async function getJcamp(tag, options) {
  let { files, root } = options;
  let locationLine = tag.data.find((e) => e.value.jcamp_location);

  if (!locationLine) {
    new Error(`There is not spectrum for ${tag}`);
    return;
  }

  let relativePath = locationLine.value.jcamp_location;
  let pathJcamp = root + relativePath.replace(/file:/s, '');
  const jcampFile = files.find((file) => file.webKitRelativePath === pathJcamp);
  if (!jcampFile) {
    new Error(`There is not jcamp with path: ${pathJcamp}`);
    return;
  }
  return {
    name: pathJcamp,
    type: 'jcamp',
    files: [jcampFile],
  };
}
