import { fileCollectionFromZip } from 'filelist-utils';

import { NmrRecord } from '../NmrRecord';

/**
 * Read nmr record file and return an instance of NmrRecord class.
 * @param {buffer|string} zipFile - zip file in memory, if it is a string e.g base64 it is need to specify the enconding. See jszip for the encoding allowed
 * @return {} An Object with two properties zip and sdfFiles.
 */
export async function readNmrRecord(zipFile) {
  const fileCollection = await fileCollectionFromZip(zipFile);
  return NmrRecord.fromFileCollection(fileCollection);
}
