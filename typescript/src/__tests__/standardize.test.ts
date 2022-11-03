jest.deepUnmock('../standardize');
jest.deepUnmock('yaml');

import standardize from '../standardize';
import { readFileSync } from 'fs';
import YAML from 'yaml';

describe('TSON standardization tests', () => {
  const dir = `${__dirname}/test-data/valid-tsons`;
  const importTsonFile = (file: string) => {
    return YAML.parse(readFileSync(`${dir}/${file}`).toString('utf8'));
  };

  // test('Should standardize a TSON object with mixed keys to all-short', () => {
  //   const tson = importTsonFile('complex.tson');
  //   tson.testName = 'the TSON is valid and only uses short parameter names';
  //   writeFileSync(`${dir}/all-short.tson`, YAML.stringify(standardize(tson)));
  // });

  // test('Should standardize a TSON object with mixed keys to all-long', () => {
  //   const tson = importTsonFile('complex.tson');
  //   tson.testName = 'the TSON is valid and only uses long parameter names';
  //   writeFileSync(`${dir}/all-long.tson`, YAML.stringify(standardize(tson, {
  //     minFrequency: 'min frequency',
  //     maxFrequency: 'max frequency',
  //     frequencyRatio: 'frequency ratio',
  //     amplitudeWeight: 'amplitude weight',
  //     tuningSystems: 'tuning systems',
  //     partialDistribution: 'partial distribution',
  //     repeatRatio: 'repeat ratio'
  //   })));
  // });

  test('Should standardize a TSON object with mixed keys to all-short', () => {
    const complex = importTsonFile('complex.tson');
    const allShort = importTsonFile('all-short.tson');
    delete complex.testName;
    delete allShort.testName;

    const reformatted = standardize(complex);
    expect(JSON.stringify(reformatted)).toBe(JSON.stringify(allShort));
  });

  test('Should standardize a TSON object with mixed keys to all-long', () => {
    const complex = importTsonFile('complex.tson');
    const allLong = importTsonFile('all-long.tson');
    delete complex.testName;
    delete allLong.testName;

    const reformatted = standardize(complex, {
      minFrequency: 'min frequency',
      maxFrequency: 'max frequency',
      frequencyRatio: 'frequency ratio',
      amplitudeWeight: 'amplitude weight',
      tuningSystems: 'tuning systems',
      partialDistribution: 'partial distribution',
      repeatRatio: 'repeat ratio'
    });

    expect(JSON.stringify(reformatted)).toBe(JSON.stringify(allLong));
  });
});