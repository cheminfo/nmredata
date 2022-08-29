export async function getBrukerFiles(tag, options) {
  let { files, root } = options;

  let locationLine = tag.data.find((e) => e.value.spectrum_location);

  if (!locationLine) {
    new Error(`There is not spectrum for ${tag}`);
    return;
  }

  let relativePath = locationLine.value.spectrum_location;
  let pathSpectrum = root + relativePath.replace(/file:/s, '');
  let toCheck = pathSpectrum.replace(/(.*\w+\/[0-9]+\/)pdata\/.*/, '$1');
  let toCheck2 = pathSpectrum.replace(/.*\/[0-9]+\/pdata\/([0-9]+)\/.*/, '$1');

  let brukerFolder = [];
  for (let file of files) {
    if (
      toCheck !==
      file.webkitRelativePath.replace(/([.*/]*\w+\/[0-9]+\/).*/, '$1')
    ) {
      continue;
    }
    if (file.webkitRelativePath.match('pdata')) {
      if (
        toCheck2 !==
        file.webkitRelativePath.replace(/.*\/[0-9]+\/pdata\/([0-9]+)\/.*/, '$1')
      ) {
        continue;
      }
    }
    brukerFolder.push(file);
  }
  return {
    name: `${pathSpectrum}`,
    extension: 'zip',
    files: brukerFolder,
  };
}
