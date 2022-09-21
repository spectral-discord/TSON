'use strict';

import { TSON } from './tson';
import * as Joi from 'joi';
import { parse } from 'mathjs';

const expression = Joi.alternatives().try(
  Joi.string().regex(/([1234567890.+\-*/^%()e ]|(pi)|(tau)|(abs))+/),
  Joi.number().positive(),
);

const frequency = Joi.alternatives().try(
  Joi.number().positive(),
  Joi.string().regex(/([.]\d+|\d+[.]?\d*)( Hz)?/)
);

const notes = Joi.array().items(
  expression,
  Joi.object().keys({
    'frequency ratio': expression.optional(),
    ratio: expression.optional(),
    name: Joi.string().optional(),
  }).xor('frequency ratio', 'ratio')
).min(1).unique((a, b) => a.name === b.name);

const tunings = Joi.array().items(Joi.object().keys({
  name: Joi.string().optional(),
  description: Joi.string().optional(),
  id: Joi.string().optional(),
  scales: Joi.array().items(Joi.object().keys({
    notes: Joi.alternatives().conditional('reference', {
      is: Joi.object().required(),
      then: Joi.alternatives().conditional('reference.note', {
        is: Joi.exist(),
        then: notes.has(Joi.object({ name: Joi.link('....reference.note') }).unknown()) ,
        otherwise: notes
      }),
      otherwise: notes
    }).required(),
    reference: Joi.alternatives().try(
      frequency,
      Joi.object().keys({
        frequency: frequency.required(),
        note: Joi.string().optional(),
      }),
    ).required(),
    'repeat ratio': expression.optional(),
    repeat: expression.optional(),
    'max frequency': frequency.optional(),
    max: frequency.optional(),
    'min frequency': frequency.optional(),
    min: frequency.optional(),
    spectrum: Joi.string().optional(),
  }).nand('repeat', 'repeat ratio')
    .nand('min', 'min frequency')
    .nand('max', 'max frequency')
  ).min(1).required()
}).or('name', 'id')).min(1).unique((a, b) => a.id === b.id).optional();

const partials = Joi.array().items(
  Joi.object().keys({
    'frequency ratio': expression.optional(),
    frequency: expression.optional(),
    ratio: expression.optional(),
    'amplitude weight': expression.optional(),
    amplitude: expression.optional(),
    weight: expression.optional(),
  })
    .xor('frequency ratio', 'ratio')
    .xor('amplitude weight', 'weight')
).min(1);

/**
 * Joi schema for validating TSON objects.
 *
 * Doesn't parse expressions, but does validate that expression strings only contain allowed substrings.
 */
export const schema = Joi.object().keys({
  'tuning systems': tunings,
  tunings,
  spectra: Joi.array().items(Joi.object().keys({
    name: Joi.string().optional(),
    description: Joi.string().optional(),
    id: Joi.string().optional(),
    'partial distribution': partials.optional(),
    partials: partials.optional()
  })
    .or('name', 'id')
    .xor('partials', 'partial distribution')
  ).min(1).unique((a, b) => a.id === b.id).optional(),
  sets: Joi.array().items(Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string().optional(),
    members: Joi.array().items(Joi.object().keys({
      'tuning system': Joi.string().optional(),
      tuning: Joi.string().optional(),
      spectrum: Joi.string().optional(),
      'override scale spectra': Joi.boolean().optional()
    }).nand('tuning system', 'tuning')).min(1).required()
  })).min(1).optional()
}).nand('tuning systems', 'tunings')
  .or('tuning systems', 'tunings', 'spectra', 'sets');

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
  options?: ValidationOptions
): boolean {
  // Set defaults for undefined options
  options = Object.assign({
    validateExpressions: true,
    includedIdsOnly: false,
    allowUnknown: true
  }, options);

  // Validate TSON syntax & values
  Joi.assert(tson, schema, 'Invalid TSON!\n', {
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
            const frequency = partial.ratio ? partial.ratio : partial['frequency ratio'];
            const amplitude = partial.weight ? partial.weight : partial['amplitude weight'];
            if (typeof(frequency) === 'string') parse(frequency);
            if (typeof(amplitude) === 'string') parse(amplitude);
          }
        }
      }
    }
  }

  return true;
}