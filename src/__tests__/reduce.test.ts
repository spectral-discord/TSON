jest.deepUnmock('../reduce');
jest.deepUnmock('yaml');

import reduce from '../reduce';
import { readFileSync } from 'fs';
import YAML from 'yaml';

describe('TSON reduction tests', () => {
  const dir = `${__dirname}/test-data/valid-tsons`;
  const importTsonFile = (file: string) => {
    return YAML.parse(readFileSync(`${dir}/${file}`).toString('utf8'));
  };

  // test('Should reduce a TSON object', () => {
  //   const tson = importTsonFile('complex.tson');
  //   tson.testName = 'the TSON is reduced';
  //   writeFileSync(`${dir}/reduced.tson`, YAML.stringify(reduce(tson)));
  // });

  test('Should reduce a TSON object', () => {
    const complex = importTsonFile('complex.tson');
    const reduced = importTsonFile('reduced.tson');
    delete complex.testName;
    delete reduced.testName;

    const reformatted = reduce(complex);
    expect(JSON.stringify(reformatted)).toBe(JSON.stringify(reduced));
  });
});