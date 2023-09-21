import { FileCollection } from 'filelist-utils';

export async function getBrukerFiles(tag, options) {
  let { fileCollection, root } = options;

  let locationLines = tag.data.filter((e) => e.value.spectrum_location);

  const sources = [];
  for (const locationLine of locationLines) {
    if (!locationLine) {
      new Error(`There is not spectrum for ${tag}`);
      return;
    }

    let relativePath = locationLine.value.spectrum_location;
    if (relativePath.match(/file:/s)) {
      let pathSpectrum = root + relativePath.replace(/file:/s, '');
      let toCheck = pathSpectrum.replace(/(.*\w+\/[0-9]+\/)pdata\/.*/, '$1');
      let toCheck2 = pathSpectrum.replace(
        /.*\/[0-9]+\/pdata\/([0-9]+)\/.*/,
        '$1',
      );
      let brukerFolder = [];
      for (let file of fileCollection) {
        if (
          toCheck !== file.relativePath.replace(/([.*/]*\w+\/[0-9]+\/).*/, '$1')
        ) {
          continue;
        }
        if (file.relativePath.match('pdata')) {
          if (
            toCheck2 !==
            file.relativePath.replace(/.*\/[0-9]+\/pdata\/([0-9]+)\/.*/, '$1')
          ) {
            continue;
          }
        }
        brukerFolder.push(file);
      }
      sources.push({
        type: 'brukerFiles',
        fileCollection: new FileCollection(brukerFolder),
      });
    } else if (relativePath.match('http')) {
      sources.push({
        type: 'url',
        value: relativePath,
      });
    }
  }
  return sources;
}
