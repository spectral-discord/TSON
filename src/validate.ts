'use strict';

import { TSON } from './tson';
import { string, number, boolean, object, array, alternatives, assert, link, exist } from 'joi';
import { parse } from 'mathjs';

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
).min(1).unique((a, b) => a.name === b.name);

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
  ).min(1).required()
}).or('name', 'id')).min(1).unique((a, b) => a.id === b.id).optional();

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
).min(1);

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
  ).min(1).unique((a, b) => a.id === b.id).optional(),
  sets: array().items(object().keys({
    name: string().required(),
    description: string().optional(),
    members: array().items(object().keys({
      'tuning system': string().optional(),
      tuning: string().optional(),
      spectrum: string().optional(),
      'override scale spectra': boolean().optional()
    }).nand('tuning system', 'tuning')).min(1).required()
  })).min(1).optional()
}).nand('tuning systems', 'tunings');

export interface ValidationOptions {
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
    allowUnknown: true
  }
): boolean {
  // Validate TSON syntax & values
  assert(tson, schema, 'Invalid TSON!\n', {
    abortEarly: false,
    allowUnknown: options.allowUnknown
  });

  if (options.includedIdsOnly) {
    // Ensure that tuning/spectrum ID references are internally resolvable
    const tuningIds: string[] = [];
    const spectrumIds: string[] = [];

    if (tson.spectra) {
      for (const spectrum of tson.spectra) {
        if (spectrum.id) spectrumIds.push(spectrum.id);
      }
    }

    if (tson.tunings) {
      for (const tuning of tson.tunings) {
        if (tuning.id) tuningIds.push(tuning.id);

        for (const scale of tuning.scales) {
          if (scale.spectrum && !spectrumIds.includes(scale.spectrum)) {
            throw new Error(`Invalid TSON!\nSpectrum [${scale.spectrum}] not found`);
          }
        }
      }
    }

    if (tson.sets) {
      for (const set of tson.sets) {
        for (const mem of set.members) {
          if (mem.tuning && !tuningIds.includes(mem.tuning)) {
            throw new Error(`Invalid TSON!\nTuning [${mem.tuning}] not found`);
          }
          if (mem.spectrum && !spectrumIds.includes(mem.spectrum)) {
            throw new Error(`Invalid TSON!\nSpectrum [${mem.spectrum}] not found`);
          }
        }
      }
    }
  }

  if (options.validateExpressions) {
    // Ensure that expressions can be evaluated
    const tunings = tson.tunings
      ? tson.tunings
      : tson['tuning systems'];

    if (tunings) {
      for (const tuning of tunings) {
        for (const scale of tuning.scales) {
          for (const note of scale.notes) {
            if (typeof(note) === 'string') {
              parse(note);
            } else if (typeof(note) === 'object') {
              const ratio = note.ratio ? note.ratio : note['frequency ratio'];
              if (typeof(ratio) === 'string') {
                parse(ratio);
              }
            }
          }
        }
      }
    }

    if (tson.spectra) {
      for (const spectrum of tson.spectra) {
        const partials = spectrum.partials
          ? spectrum.partials
          : spectrum['partial distribution'];

        if (partials) {
          for (const partial of partials) {
            const frequency = partial.frequency
              ? partial.frequency
              : partial.ratio
                ? partial.ratio
                : partial['frequency ratio'];

            const amplitude = partial.amplitude
              ? partial.amplitude
              : partial.weight
                ? partial.weight
                : partial['amplitude weight'];

            if (typeof(frequency) === 'string') parse(frequency);
            if (typeof(amplitude) === 'string') parse(amplitude);
          }
        }
      }
    }
  }

  return true;
}