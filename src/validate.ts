'use strict';

import { TSON } from './tson';
import { string, number, boolean, object, array, alternatives, assert, link, exist } from 'joi';

// TODO: Expression parsing
const expression = string().regex(/([1234567890.+-*/^%()e ]|(pi)|(tau)|(abs))+/);

const frequency = alternatives().try(
  number().positive(),
  string().regex(/([.]\d+|\d+[.]?\d*)( Hz)?/)
);

const notes = array().items(
  expression,
  object().keys({
    'frequency ratio': expression.optional(),
    ratio: expression.optional(),
    name: string().optional(),
  }).xor('frequency ratio', 'ratio')
).unique((a, b) => a.name === b.name);

const tunings = array().items(object().keys({
  name: string().optional(),
  description: string().optional(),
  id: string().optional(),
  scales: array().items(object().keys({
    notes: alternatives().conditional('reference', {
      is: object().required(),
      then: alternatives().conditional('reference.note', { 
        is: exist(), 
        then: notes.has(object({ name: link('....reference.note') }).unknown()) ,
        otherwise: notes
      }),
      otherwise: notes
    }).required(),
    reference: alternatives().try(
      frequency,
      object().keys({
        frequency: frequency.required(),
        note: string().optional(),
      }),
    ).required(),
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

const partials = array().items(
  object().keys({
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
    'partial distribution': partials.optional(),
    partials: partials.optional()
  })
    .or('name', 'id')
    .xor('partials', 'partial distribution')
  ).unique((a, b) => a.id === b.id).optional(),
  sets: array().items(object().keys({
    name: string().required(),
    description: string().optional(),
    members: array().items(object().keys({
      'tuning system': string().optional(),
      tuning: string().optional(),
      spectrum: string().optional(),
      'override scale spectra': boolean().optional()
    }).nand('tuning system', 'tuning')).required()
  })).optional()
}).nand('tuning systems', 'tunings');

interface ValidationOptions {
  validateExpressions?: boolean,
  includedIdsOnly?: boolean,
  allowUnknown?: boolean
}

/**
 * TSON syntax validation
 */
export default function validate(
  tson: TSON, 
  options: ValidationOptions = {
    validateExpressions: true,
    includedIdsOnly: false,
    allowUnknown: false
  }
): boolean {
  assert(tson, schema, 'Invalid TSON!\n', { 
    abortEarly: false, 
    allowUnknown: options.allowUnknown 
  });

  if (options.includedIdsOnly) {
    // Ensure that tuning/spectrum ID references are internally resolvable


  }

  if (options.validateExpressions) {
    // Ensure that expressions can be evaluated

  }

  return true;
}