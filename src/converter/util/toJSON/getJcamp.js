import { FileCollection } from 'filelist-utils';

export async function getJcamp(tag, options) {
  let { fileCollection, root } = options;
  let locationLine = tag.data.find((e) => e.value.jcamp_location);

  if (!locationLine) {
    new Error(`There is not spectrum for ${tag}`);
    return;
  }

  let relativePath = locationLine.value.jcamp_location;
  let pathJcamp = root + relativePath.replace(/file:/s, '');
  const jcampFile = fileCollection.files.find(
    (file) => file.relativePath === pathJcamp,
  );
  if (!jcampFile) {
    new Error(`There is not jcamp with path: ${pathJcamp}`);
    return;
  }
  return [
    {
      name: pathJcamp,
      type: 'jcamp',
      fileCollection: new FileCollection([jcampFile]),
    },
  ];
}
