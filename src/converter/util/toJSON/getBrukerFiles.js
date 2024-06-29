import { FileCollection } from 'filelist-utils';

export async function getBrukerFiles(tag, options) {
  let { fileCollection, root } = options;

  let locationLines = tag.data.filter((e) => e.value.spectrum_location);

  const sources = [];
  for (const locationLine of locationLines) {
    if (!locationLine) {
      // TODO: fix this
      // eslint-disable-next-line no-new
      new Error(`There is not spectrum for ${tag}`);
      return;
    }

    let relativePath = locationLine.value.spectrum_location;
    if (relativePath.match(/file:/s)) {
      let pathSpectrum = root + relativePath.replace(/file:[./]*/s, '');
      const regexRootPath = pathSpectrum.match(/[ser|fid]/s)
        ? /([.*/]*\w+\/[0-9]+\/).*/
        : /(.*\w+\/[0-9]+\/)pdata\/.*/;
      let toCheck = pathSpectrum.replace(regexRootPath, '$1');

      let toCheck2 = pathSpectrum.replace(
        /.*\/[0-9]+\/pdata\/([0-9]+)\/.*/,
        '$1',
      );
      let brukerFolder = [];
      for (let file of fileCollection) {
        if (file.relativePath.match('pdata')) {
          if (
            toCheck2 !==
            file.relativePath.replace(/.*\/[0-9]+\/pdata\/([0-9]+)\/.*/, '$1')
          ) {
            continue;
          }
        }

        const path = file.relativePath.replace(/([.*/]*\w+\/[0-9]+\/).*/, '$1');
        if (
          toCheck !== path &&
          !['ser', 'fid'].some((e) => pathSpectrum === `${path}${e}`)
        ) {
          continue;
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
