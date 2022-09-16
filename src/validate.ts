'use strict';

import { string, number, object, array, alternatives, boolean } from 'joi';

// TODO: Expression parsing
const expression = string().regex(/([1234567890.+-*/^%()e ]|(pi)|(tau)|(abs))+/);

const frequency = alternatives().try(
  number().positive(),
  string().regex(/([.]\d+|\d+[.]?\d*)( Hz)?/)
);

const tunings = array().items(object().keys({
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
    .nand('repeat', 'repeat ratio')
    .nand('min', 'min frequency')
    .nand('max', 'max frequency')
  ).required()
}).or('name', 'id')).unique((a, b) => a.id === b.id).optional();

const partials = array().items(object().keys({
  'frequency ratio': expression.optional(),
  frequency: expression.optional(),
  ratio: expression.optional(),
  'amplitude weight': expression.optional(),
  amplitude: expression.optional(),
  weight: expression.optional(),
})
  .xor('frequency ratio', 'frequency', 'ratio')
  .xor('amplitude weight', 'amplitude', 'weight')
);

/**
 * Joi schema for validating TSON objects.
 * 
 * Doesn't parse expressions, but does validate that expression strings only contain allowed substrings. 
 */
export const schema = object().keys({
  'tuning systems': tunings,
  tunings,
  spectra: array().items(object().keys({
    name: string().optional(),
    description: string().optional(),
    id: string().optional(),
    'partial distribution': partials,
    partials
  }).or('name', 'id')).unique((a, b) => a.id === b.id).optional(),
  sets: array().items(object().keys({
    name: string().optional(),
    description: string().optional(),
    members: array().items(object().keys({
      'tuning system': string().optional(),
      tuning: string().optional(),
      spectrum: string().optional(),
      'override scale spectra': boolean().optional()
    }).nand('tuning system', 'tuning'))
  })).optional()
}).nand('tuning systems', 'tunings');

interface ValidationOptions {
  validateExpressions?: boolean,
  includedIdentifiersOnly?: boolean
}

interface TSON {

}

// TODO: TSON type def
export default function validate(
  tson: TSON, 
  options: ValidationOptions = {
    validateExpressions: true,
    includedIdentifiersOnly: false
  }
): boolean {
  console.log(options.validateExpressions);
  const schemaValid = schema.validate(tson);

  return true;
}