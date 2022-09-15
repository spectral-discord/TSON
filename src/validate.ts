'use strict';

import { string, number, object, array, alternatives } from 'joi';

const frequency = alternatives().try(
  number().positive(),
  string().regex(/([.]\d+|\d+[.]?\d*)( Hz)?/)
);

// TODO: Expression parsing
const expression = string().regex(/([1234567890.+-*/^%()|e ]|(pi))+/);

export const schema = object().keys({
  'tuning systems': array().items(object().keys({
    name: string().optional(),
    description: string().optional(),
    id: string().optional(),
    scales: array().items(object().keys({
      notes: array().items(
        expression,
        object().keys({
          'frequency ratio': expression.optional(),
          ratio: expression.optional(),
          name: string().optional(),
        }).xor('frequency ratio', 'ratio')
      ).unique((a, b) => a.name === b.name).required(),
      reference: frequency.optional(),
      'reference frequency': frequency.optional(),
      'reference note': string().optional(),
      'repeat ratio': number().positive().optional(),
      repeat: number().positive().optional(),
      'max frequency': frequency.optional(),
      max: frequency.optional(),
      'min frequency': frequency.optional(),
      min: frequency.optional(),
      spectrum: string().optional(),
    }).xor('reference', 'reference frequency')
      .or('repeat', 'repeat ratio')
      .or('min', 'min frequency')
      .or('max', 'max frequency')
    ).required()
  })).unique((a, b) => a.id === b.id).required()
});

// TODO: TSON type def
export default function validate(tson) {
  return schema.validate(tson);
}