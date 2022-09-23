jest.deepUnmock('../validate');
jest.deepUnmock('yaml');

import validate from '../validate';
import { readdirSync, readFileSync } from 'fs';
import YAML from 'yaml';

describe('Validation function', () => {
  let Validate: any;
  let assert: any;
  beforeEach(() => {
    jest.resetModules();
    import('../validate').then(module => {
      Validate = module.default;
    });
    import('joi').then(module => {
      assert = module.assert;
    });
    jest.mock('joi', () => ({
      assert: jest.fn().mockReturnThis(),
      string: jest.fn().mockReturnThis(),
      number: jest.fn().mockReturnThis(),
      object: jest.fn().mockReturnThis(),
      alternatives: jest.fn().mockReturnThis(),
      array: jest.fn().mockReturnThis(),
      exist: jest.fn().mockReturnThis(),
      regex: jest.fn().mockReturnThis(),
      optional: jest.fn().mockReturnThis(),
      required: jest.fn().mockReturnThis(),
      positive: jest.fn().mockReturnThis(),
      try: jest.fn().mockReturnThis(),
      keys: jest.fn().mockReturnThis(),
      min: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      xor: jest.fn().mockReturnThis(),
      nand: jest.fn().mockReturnThis(),
      unique: jest.fn().mockReturnThis(),
      items: jest.fn().mockReturnThis(),
      link: jest.fn().mockReturnThis(),
      unknown: jest.fn().mockReturnThis(),
      has: jest.fn().mockReturnThis(),
      conditional: jest.fn().mockReturnThis(),
      boolean: jest.fn().mockReturnThis(),
      description: jest.fn().mockReturnThis(),
      ref: jest.fn().mockReturnThis(),
      valid: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
    }));
  });

  test('Should call `assert`', () => {
    Validate({}, { validateExpressions: false });

    expect(assert).toBeCalledTimes(1);
  });
});

describe('Validate TSON examples', () => {
  const importTsonFile = (file: string, directory: string) => {
    const tson = YAML.parse(readFileSync(`${dataDir}/${directory}/${file}`).toString('utf8'));
    const data: any = { tson, testName: tson.testName };
    delete data.tson.testName;

    if (tson.validationOptions) {
      data.validationOptions = tson.validationOptions;
      delete data.tson.validationOptions;
    }

    return data;
  };

  const dataDir = `${__dirname}/test-data`;
  const invalidFiles = readdirSync(`${dataDir}/invalid-tsons`);
  const invalid = invalidFiles.map(file => importTsonFile(file, 'invalid-tsons'));
  const validFiles = readdirSync(`${dataDir}/valid-tsons`);
  const valid = validFiles.map(file => importTsonFile(file, 'valid-tsons'));

  if (invalid.length > 0) {
    test.each(invalid)(
      'Should throw when $testName',
      ({ tson, validationOptions }) => {
        expect(() => validate(tson, validationOptions)).toThrow();
      }
    );
  }

  if (valid.length > 0) {
    test.each(valid)(
      'Should pass when $testName',
      ({ tson, validationOptions }) => {
        expect(validate(tson, validationOptions)).toBe(true);
      }
    );
  }
});