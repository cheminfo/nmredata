import { readFileSync } from 'fs';
import { resolve } from 'path';
import {readNMRR, readNMRRSync} from '../index';

describe('NMReDATA reading', () => {
  var nmrRecordWithJcampFromSync = readNMRRSync(resolve('testFiles/generated.zip'));
  var zipBrukerSeveralSDF = readFileSync(resolve('testFiles/menthol_1D_1H_assigned_J.zip'), 'base64');
  var zipWithJcamp = readFileSync(resolve('testFiles/generated.zip'), 'base64');
  it('Test nmredata read async', async () => {
    var nr = await readNMRR(zipBrukerSeveralSDF);
    var sdfFileList = nr.getSDFList();
    expect(6).toBe(sdfFileList.length);
    expect(sdfFileList[nr.activeElement]).toBe(sdfFileList[0]);
  });
  it('Test nmredata read sync', () => {
    var nr = readNMRRSync(resolve('testFiles/menthol_1D_1H_assigned_J.zip'));
    var sdfFileList = nr.getSDFList();
    expect(6).toBe(sdfFileList.length);
    expect(sdfFileList[nr.activeElement]).toBe(sdfFileList[0]);
  });
  it('nmrRecord with jcamp, sync reading', () => {
    var sdfFileList = nmrRecordWithJcampFromSync.getSDFList();
    expect(1).toBe(sdfFileList.length);
    expect(sdfFileList[nmrRecordWithJcampFromSync.activeElement]).toBe(sdfFileList[0]);
  });
  it('nmrRecord to json, looking spectrum path', () => {
    var filenames = ['MP-caryophyllene_oxide_small/11/pdata/1/','MP-caryophyllene_oxide_small/10/pdata/1/','jcampData/1H_spectrum.jdx'];
    let json = nmrRecordWithJcampFromSync.toJSON();
    for (let nmr of json.spectra.nmr) {
      expect(filenames.includes(nmr.jcamp.filename)).toBe(true);
    }
  });
  it('nmrRecord to json from async, looking spectrum path', async () => {
    var nmrRecordWithJcampFromASync = await readNMRR(zipWithJcamp);    
    var filenames = ['MP-caryophyllene_oxide_small/11/pdata/1/','MP-caryophyllene_oxide_small/10/pdata/1/','jcampData/1H_spectrum.jdx'];
    let json = nmrRecordWithJcampFromASync.toJSON();
    for (let nmr of json.spectra.nmr) {
      expect(filenames.includes(nmr.jcamp.filename)).toBe(true);
    }
  });
});