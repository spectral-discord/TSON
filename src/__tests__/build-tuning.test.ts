jest.deepUnmock('../build-tuning');
jest.deepUnmock('yaml');

import buildTuning from '../build-tuning';
import { readFileSync } from 'fs';
import YAML from 'yaml';

describe('TSON standardization tests', () => {
  const tsonDir = `${__dirname}/test-data/valid-tsons`;
  const dataDir = `${__dirname}/test-data`;
  const importTsonFile = (file: string) => {
    return YAML.parse(readFileSync(`${tsonDir}/${file}`).toString('utf8'));
  };

  // test('Should build a 12-tet tuning from a fully-described 12tet TSON', () => {
  //   const tuning = importTsonFile('full-12tet.tson').tunings[0];

  //   const built = buildTuning(tuning);
  //   writeFileSync(`${dataDir}/built-12tet.json`, JSON.stringify(built));
  // });

  test('Should build a 12-tet tuning from a fully-described 12tet TSON', () => {
    const tuning = importTsonFile('full-12tet.tson').tunings[0];
    const validBuilt = readFileSync(`${dataDir}/built-12tet.json`).toString('utf8');

    const built = buildTuning(tuning);
    expect(JSON.stringify(built)).toBe(validBuilt);
  });
});