import JSZip from 'jszip';

export async function extractZipFolder(tag, options) {
  let { zipFiles, root } = options;

  let locationLine = tag.data.find((e) => e.value.spectrum_location);

  if (!locationLine) {
    // TODO: fix this
    // eslint-disable-next-line no-new
    new Error(`There is not spectrum for ${tag}`);
    return;
  }

  let relativePath = locationLine.value.spectrum_location;
  let pathSpectrum = root + relativePath.replace(/file:/s, '');
  let toCheck = pathSpectrum.replace(/(.*\w+\/[0-9]+\/)pdata\/.*/, '$1');
  let toCheck2 = pathSpectrum.replace(/.*\/[0-9]+\/pdata\/([0-9]+)\/.*/, '$1');

  let zipFolder = new JSZip();
  for (let file in zipFiles) {
    if (toCheck !== file.replace(/([.*/]*\w+\/[0-9]+\/).*/, '$1')) continue;
    if (file.match('pdata')) {
      if (toCheck2 !== file.replace(/.*\/[0-9]+\/pdata\/([0-9]+)\/.*/, '$1')) {
        continue;
      }
    }
    if (file.endsWith('/')) continue;
    // eslint-disable-next-line no-await-in-loop
    const arrayBuffer = await zipFiles[file].async('arraybuffer');
    zipFolder.file(file, arrayBuffer);
  }
  return {
    name: `${pathSpectrum}`,
    extension: 'zip',
    binary: await zipFolder.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    }),
  };
}
