jest.deepUnmock('yaml');
jest.unmock('../tson');

jest.mock('mathjs', () => ({
  evaluate: jest.fn(),
}));

jest.mock('joi', () => ({
  assert: jest.fn(),
}));

jest.mock('../validate', () => ({
  __esModule: true,
  default: jest.fn(),
  validationOptionsSchema: jest.fn()
}));

jest.mock('../standardize', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(tson => tson),
  standardizationOptionsSchema: jest.fn()
}));

jest.mock('../build-tuning', () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock('../reduce', () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock('../export', () => ({
  __esModule: true,
  toTSON: jest.fn()
}));

import { readFileSync } from 'fs';
import YAML from 'yaml';
import { TSON } from '../tson';
import * as validate from '../validate';
import * as standardize from '../standardize';
import * as reduce from '../reduce';
import { assert } from 'joi';
import { toTSON } from '../export';

const dir = `${__dirname}/test-data/valid-tsons`;
const importTsonFile = (file: string) => {
  return readFileSync(`${dir}/${file}`).toString('utf8');
};

describe('constructor tests', () => {
  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  test('Shouldn\'t call load() when no initializer TSONs are provided', () => {
    const load = jest.spyOn(TSON.prototype, 'load').mockImplementation();
    new TSON();
    expect(load).toHaveBeenCalledTimes(0);
  });

  test('Should call load() once when an initializer TSON is provided', () => {
    const complex = YAML.parse(importTsonFile('complex.tson'));
    const load = jest.spyOn(TSON.prototype, 'load').mockImplementation();
    new TSON(complex);
    expect(load).toHaveBeenCalledTimes(1);
  });

  test('Should call load() twice when 2 initializers are provided TSON is provided', () => {
    const complex = YAML.parse(importTsonFile('complex.tson'));
    const minimal = importTsonFile('minimal-12tet.tson');
    const load = jest.spyOn(TSON.prototype, 'load').mockImplementation();
    new TSON([ complex, minimal ]);
    expect(load).toHaveBeenCalledTimes(2);
  });

  test('Should accept 3 types of initializers and call load() for each', () => {
    const complex = YAML.parse(importTsonFile('complex.tson'));
    const minimal = importTsonFile('minimal-12tet.tson');
    const full = importTsonFile('full-12tet.tson');

    const load = jest.spyOn(TSON.prototype, 'load').mockImplementation();
    const fullTson = new TSON(full);
    new TSON([ complex, minimal, fullTson ]);
    expect(load).toHaveBeenCalledTimes(4);
  });
});

describe('load tests', () => {
  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  test('Should call validate() when load is called and no standardization options are set', () => {
    const complex = YAML.parse(importTsonFile('complex.tson'));
    const tson = new TSON();
    tson.load(complex);

    expect(validate.default).toHaveBeenCalledTimes(1);
    expect(standardize.default).toHaveBeenCalledTimes(0);
  });

  test('Should call validate() and standardize() when load is called and standardization options are set', () => {
    const complex = YAML.parse(importTsonFile('complex.tson'));
    const tson = new TSON(undefined, {
      standardizationOptions: {
        repeatRatio: 'repeat',
        minFrequency: 'min',
        maxFrequency: 'max',
        frequencyRatio: 'ratio',
        amplitudeWeight: 'weight',
        partialDistribution: 'partials',
      }
    });
    tson.load(complex);

    expect(validate.default).toHaveBeenCalledTimes(1);
    expect(standardize.default).toHaveBeenCalledTimes(1);
  });

  test('Should call reduce() but not standardize() when load is called and both standardization options exist and reduce is set to true', () => {
    const complex = YAML.parse(importTsonFile('complex.tson'));
    const tson = new TSON(undefined, {
      standardizationOptions: {
        repeatRatio: 'repeat',
        minFrequency: 'min',
        maxFrequency: 'max',
        frequencyRatio: 'ratio',
        amplitudeWeight: 'weight',
        partialDistribution: 'partials',
      }
    });
    tson.load(complex, { reduce: true });

    expect(standardize.default).toHaveBeenCalledTimes(0);
    expect(reduce.default).toHaveBeenCalledTimes(1);
  });

  test('Should not call standardize() when load is called and standardization options exist but standardize is set to false', () => {
    const complex = YAML.parse(importTsonFile('complex.tson'));
    const tson = new TSON(undefined, {
      standardizationOptions: {
        repeatRatio: 'repeat',
        minFrequency: 'min',
        maxFrequency: 'max',
        frequencyRatio: 'ratio',
        amplitudeWeight: 'weight',
        partialDistribution: 'partials',
      }
    });
    tson.load(complex, { standardize: false });

    expect(standardize.default).toHaveBeenCalledTimes(0);
  });

  test('Should call reduce() but not standardize() when load is called and both standardize and reduce is set to true', () => {
    const complex = YAML.parse(importTsonFile('complex.tson'));
    const tson = new TSON();
    tson.load(complex, { reduce: true, standardize: true });

    expect(standardize.default).toHaveBeenCalledTimes(0);
    expect(reduce.default).toHaveBeenCalledTimes(1);
  });

  test('Should call reduce() but not standardize() when load is called and standardize is set to true but no standardization options exist', () => {
    const complex = YAML.parse(importTsonFile('complex.tson'));
    const tson = new TSON();
    tson.load(complex, { standardize: true });

    expect(standardize.default).toHaveBeenCalledTimes(1);
  });

  test('Should call assert() and standardize() when setStandardizationOptions() is called', () => {
    const tson = new TSON();

    interface StandardizationOptions {
      repeatRatio: 'repeat' | 'repeat ratio',
      minFrequency: 'min' | 'minimum' | 'min frequency',
      maxFrequency: 'max' | 'maximum' | 'max frequency',
      frequencyRatio: 'frequency ratio' | 'ratio',
      amplitudeWeight: 'amplitude weight' | 'weight',
      partialDistribution: 'partials' | 'partial distribution',
    }

    const options: StandardizationOptions = {
      repeatRatio: 'repeat',
      minFrequency: 'min',
      maxFrequency: 'max',
      frequencyRatio: 'ratio',
      amplitudeWeight: 'weight',
      partialDistribution: 'partials'
    };

    tson.setStandardizationOptions(options);

    const assertMock: any = assert;
    expect(assertMock).toHaveBeenCalledTimes(1);
    expect(assertMock.mock.calls[0][0]).toBe(options);
    expect(assertMock.mock.calls[0][1]).toBe(standardize.standardizationOptionsSchema);
    expect(standardize.default).toHaveBeenCalledTimes(1);
  });

  test('Should call assert() and validate() when setValidationOptions() is called', () => {
    const tson = new TSON();

    interface ValidationOptions {
      includedIdsOnly: boolean,
      allowUnknown: boolean
    }

    const options: ValidationOptions = {
      includedIdsOnly: true,
      allowUnknown: false
    };

    tson.setValidationOptions(options);

    const assertMock: any = assert;
    expect(assertMock).toHaveBeenCalledTimes(1);
    expect(assertMock.mock.calls[0][0]).toBe(options);
    expect(assertMock.mock.calls[0][1]).toBe(validate.validationOptionsSchema);
    expect(validate.default).toHaveBeenCalledTimes(1);
  });
});

describe('processing TSON data tests', () => {
  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  test('Should call reduce() when reduce() is called', () => {
    const tson = new TSON();

    tson.reduce();

    const reduceMock: any = reduce.default;
    expect(reduceMock).toHaveBeenCalledTimes(1);
    expect(reduceMock.mock.calls[0][0]).toBe(tson);
  });

  test('Should stringify the TSON data when stringify() is called', () => {
    const tson = new TSON();
    tson.stringify();

    expect(toTSON).toHaveBeenCalledTimes(1);
  });
});