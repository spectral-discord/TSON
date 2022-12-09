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
  default: jest.fn().mockReturnValue(true),
  validationOptionsSchema: jest.fn()
}));

jest.mock('../standardize', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({})),
  standardizationOptionsSchema: jest.fn()
}));

jest.mock('../build-tuning', () => ({
  __esModule: true,
  default: jest.fn()
}));

import { readFileSync } from 'fs';
import YAML from 'yaml';
import { TSON } from '../tson';
import * as validate from '../validate';
import * as standardize from '../standardize';

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
  test('Should call validate when load is called', () => {
    const complex = YAML.parse(importTsonFile('complex.tson'));
    const tson = new TSON();
    tson.load(complex);

    expect(validate.default).toHaveBeenCalledTimes(1);
    expect(standardize.default).toHaveBeenCalledTimes(1);
  });
});