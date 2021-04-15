import { resolve } from 'path';

import { readNmrRecord, readNmrRecordSync } from '../index';
import { nmredata } from 'nmredata-data-test';
import Jszip from 'jszip';
import { writeFileSync } from 'fs';

describe('NMReDATA reading', () => {
  let nmrRecordWithJcampFromSync = readNmrRecordSync(
    resolve('src/__tests__/generated.zip'),
  );
  it.only('Test nmredata read async', async () => {
    let nr = await readNmrRecord(nmredata['menthol_1D_1H_assigned_J.zip']);
    let json = await nr.toJSON();
    writeFileSync('json.json', JSON.stringify(json));
    // let sdfFileList = nr.getSDFList();
    // expect(6).toBe(sdfFileList.length);
    // expect(sdfFileList[nr.activeElement]).toBe(sdfFileList[0]);
  });
  it('Test nmredata read sync', () => {
    let nr = readNmrRecordSync(
      resolve('testFiles/menthol_1D_1H_assigned_J.zip'),
    );
    let sdfFileList = nr.getSDFList();
    expect(6).toBe(sdfFileList.length);
    expect(sdfFileList[nr.activeElement]).toBe(sdfFileList[0]);
  });
  it('nmrRecord with jcamp, sync reading', () => {
    let sdfFileList = nmrRecordWithJcampFromSync.getSDFList();
    expect(1).toBe(sdfFileList.length);
    expect(sdfFileList[nmrRecordWithJcampFromSync.activeElement]).toBe(
      sdfFileList[0],
    );
  });
  it('nmrRecord to json, looking spectrum path', () => {
    let filenames = nmrRecordWithJcampFromSync.getSpectraList();
    let json = nmrRecordWithJcampFromSync.toJSON();
    for (let nmr of json.spectra.nmr) {
      expect(filenames).toContain(nmr.jcamp.filename);
    }
  });
  it('nmrRecord to json from async, looking spectrum path', async () => {
    let nmrRecordWithJcampFromASync = await readNmrRecord(nmredata['generated.zip']);
    let filenames = nmrRecordWithJcampFromASync.getSpectraList();
    let json = nmrRecordWithJcampFromASync.toJSON();
    for (let nmr of json.spectra.nmr) {
      expect(filenames).toContain(nmr.jcamp.filename);
    }
  });
});
