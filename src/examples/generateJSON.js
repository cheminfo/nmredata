import { writeFileSync } from 'fs';

import { nmredata } from 'nmredata-data-test';

import { readNmrRecord } from '../index';

readNmrRecord(nmredata['arborinine_full_assignments.zip'], {
  zipOptions: { base64: true },
}).then(async (nmrRecord) => {
  let json = await nmrRecord.toJSON();
  writeFileSync('generated.json', JSON.stringify(json));
});
