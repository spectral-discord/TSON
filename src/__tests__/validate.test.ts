jest.deepUnmock('../validate');

import validate, { schema, ValidationOptions } from '../validate';
import { TSON } from '../tson';
import * as Joi from 'joi';

console.log(validate);

describe('Validation function', () => {
  let Validate: (tson: TSON, options?: ValidationOptions) => boolean;
  let assert: (value: any, schema: Joi.Schema<any>, options?: Joi.ValidationOptions) => void;
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
    }));
  });
  it('Should call `assert`', () => {
    const tson: TSON = {};

    Validate(tson, { validateExpressions: false });

    expect(assert).toBeCalledTimes(1);
    expect(assert).toBeCalledWith(tson, schema, 'Invalid TSON!\n', {
      abortEarly: false,
      allowUnknown: true
    });
  });
});

export {};