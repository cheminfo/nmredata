import { parseSDF } from '../parser/parseSDF';

/**
 * Extract sdf files from a file list and parse all of them.
 * @param {PartialFileList} files - file list
 * @returns {Array} Array of sdf parsed files
 */
export async function getSDF(files) {
  let result = [];
  for (const file of files) {
    const pathFile = file.relativePath.split('/');
    if (/^[^.].+sdf|nmredata$/.exec(file.name)) {
      // eslint-disable-next-line no-await-in-loop
      const sdf = await file.text();
      if (!sdf.match('NMREDATA')) continue;

      const parserResult = parseSDF(`${sdf}`, { mixedEOL: true });
      const root = pathFile.slice(0, pathFile.length - 1).join('/');
      result.push({
        ...parserResult,
        filename: file.name,
        root: root !== '' ? `${root}/` : '',
      });
    }
  }
  return result;
}
