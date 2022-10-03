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
    if (/^[^.].+sdf$/.exec(file.name)) {
      const filename = file.name.replace(/\.sdf/, '');
      const root = pathFile.slice(0, pathFile.length - 1).join('/');
      const sdf = await file.text();
      let parserResult = parseSDF(`${sdf}`, { mixedEOL: true });
      parserResult.filename = filename;
      parserResult.root = root !== '' ? `${root}/` : '';
      result.push(parserResult);
    }
  }
  return result;
}
