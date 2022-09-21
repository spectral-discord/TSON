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
    'frequency ratio': expression.description('The note\'s frequency ratio').optional(),
    ratio: expression.description('The note\'s frequency ratio').optional(),
    name: Joi.string().description('The note\'s name').optional(),
  }).unknown().xor('frequency ratio', 'ratio')
).min(1)
  .unique((a, b) => a.name === b.name)
  .description('List of the scale\'s notes');

const tunings = Joi.array().items(Joi.object().keys({
  name: Joi.string().description('The tuning system\'s name').optional(),
  description: Joi.string().description('A description of the tuning system').optional(),
  id: Joi.string().description('A unique identifier for the tuning system').optional(),
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
        frequency: frequency.description('The reference frequency - a number, optionally with " Hz" appended').required(),
        note: Joi.string().description('The name of the note that should be mapped onto the reference frequency').optional(),
      }).unknown(),
    ).description('A reference frequency that is used to map the note\'s frequency ratios to real frequencies values (ie., in Hz).\nCan be either a number (optionally appended with " Hz") or an object containing a frequency and an optional note that references one of the note names from the scale\'s notes list.\nIf no note name is provided, the reference frequency will be mapped to the frequency ratio "1".').required(),
    'repeat ratio': expression.description('The frequency ratio at which the scale\'s notes will repeat').optional(),
    repeat: expression.description('The frequency ratio at which the scale\'s notes will repeat').optional(),
    'max frequency': frequency.description('A maximum frequency for the scale.\nWhen mapping the scale\'s notes onto actual frequencies, notes from this scale will not be mapped above the provided frequency.').optional(),
    max: frequency.description('A maximum frequency for the scale.\nWhen mapping the scale\'s notes onto actual frequencies, notes from this scale will not be mapped above the provided frequency.').optional(),
    'min frequency': frequency.description('A minimum frequency for the scale.\nWhen mapping the scale\'s notes onto actual frequencies, notes from this scale will not be mapped below the provided frequency.').optional(),
    min: frequency.description('A minimum frequency for the scale.\nWhen mapping the scale\'s notes onto actual frequencies, notes from this scale will not be mapped below the provided frequency.').optional(),
    spectrum: Joi.string().description('The spectrum of the tones that should be used for this tuning.\nThis enables multiple, scale-dependent spectra to be used within a single tuning system.').optional(),
  }).nand('repeat', 'repeat ratio')
    .nand('min', 'min frequency')
    .nand('max', 'max frequency')
    .unknown()
  ).min(1).description('List of scale objects').required()
}).or('name', 'id')
  .unknown()
).min(1)
  .unique((a, b) => a.id === b.id)
  .description('List of tuning system objects').optional();

const partials = Joi.array().items(
  Joi.object().keys({
    'frequency ratio': expression.description('The partial\'s frequency ratio').optional(),
    ratio: expression.description('The partial\'s frequency ratio').optional(),
    'amplitude weight': expression.description('The partial\'s amplitude weight.\nThis determines how much the partial contributes to the overall power (ie., loudness) of the reconstructed spectrum.').optional(),
    weight: expression.description('The partial\'s amplitude weight.\nThis determines how much the partial contributes to the overall power (ie., loudness) of the reconstructed spectrum.').optional(),
  }).xor('frequency ratio', 'ratio')
    .xor('amplitude weight', 'weight')
    .unknown()
).min(1).description('A list of partials that should be used to reconstruct the spectrum');

/**
 * Joi schema for validating TSON objects.
 *
 * Doesn't parse expressions, but does validate that expression strings only contain allowed substrings.
 */
export const schema = Joi.object().keys({
  'tuning systems': tunings,
  tunings,
  spectra: Joi.array().items(Joi.object().keys({
    name: Joi.string().description('The spectrum\'s name').optional(),
    description: Joi.string().description('A description of the spectrum').optional(),
    id: Joi.string().description('A unique identifier for the spectrum').optional(),
    'partial distribution': partials.optional(),
    partials: partials.optional()
  }).or('name', 'id')
    .xor('partials', 'partial distribution')
    .unknown()
  ).min(1)
    .unique((a, b) => a.id === b.id)
    .description('A list of spectrum objects')
    .optional(),
  sets: Joi.array().items(Joi.object().keys({
    name: Joi.string().description('The set\'s name').required(),
    description: Joi.string().description('A description of the set').optional(),
    members: Joi.array().items(Joi.object().keys({
      'tuning system': Joi.string().description('A reference of a tuning system\'s ID').optional(),
      tuning: Joi.string().description('A reference of a tuning system\'s ID').optional(),
      spectrum: Joi.string().description('A reference of a spectrum\'s ID').optional(),
      'override scale spectra': Joi.boolean().description('If true, the set\'s spectrum should be applied to all scales in the set\'s tuning system, overriding any spectra that are references by the scales.').optional()
    }).nand('tuning system', 'tuning').unknown())
      .min(1)
      .description('A list of set member objects')
      .required()
  }).unknown()).min(1).description('A list of set objects').optional()
}).nand('tuning systems', 'tunings')
  .or('tuning systems', 'tunings', 'spectra', 'sets')
  .unknown();

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