'use strict';

import { TSON } from './tson';
import Joi from 'joi';
import { evaluate } from 'mathjs';
import YAML from 'yaml';

const parseExpression = (value: string, helpers: any) => {
  try {
    if (evaluate(value) <= 0) {
      return helpers.message(`Expression must evaluate to a positive number: "${value}"`);
    }
  } catch (ex) {
    return helpers.message(`Expression invalid, unable to parse: "${value}"`);
  }

  return value;
};

const expression = Joi.alternatives().try(
  Joi.number().positive(),
  Joi.string().regex(/^([1234567890.,+\-*/^%()e ]|(pi)|(tau)|(abs)|(log))+$/).custom(parseExpression),
);

const frequency = Joi.alternatives().try(
  Joi.number().positive(),
  Joi.string().regex(/^(0*[1-9][0-9]*(\.[0-9]+)?|0+\.[0-9]*[1-9][0-9]*)( Hz)?$/)
);

const notes = Joi.array().items(Joi.alternatives().conditional(Joi.object(), {
  then: Joi.object({
    'frequency ratio': expression.description('The note\'s frequency ratio').optional(),
    ratio: expression.description('The note\'s frequency ratio').optional(),
    name: Joi.string().description('The note\'s name').optional(),
  }).xor('ratio', 'frequency ratio').unknown(),
  otherwise: expression.description('The note\'s frequency ratio')
})).min(1)
  .unique((a, b) => {
    const aFreq = typeof a === 'object' ? a['frequency ratio'] || a.ratio : a;
    const bFreq = typeof b === 'object' ? b['frequency ratio'] || b.ratio : b;

    if (aFreq && bFreq && aFreq === bFreq) {
      return true;
    }

    let evaluatedA;
    let evaluatedB;

    try {
      evaluatedA = evaluate(String(aFreq));
    } catch (ex) {
      return false;
    }

    try {
      evaluatedB = evaluate(String(bFreq));
    } catch (ex) {
      return false;
    }

    return evaluatedA === evaluatedB;
  })
  .messages({
    'array.unique': 'The notes array contains frequency ratios that evaluate to the same value: "{#value.ratio || #value.[frequency ratio] || #value}", "{#dupeValue.ratio || #dupeValue.[frequency ratio] || #dupeValue}"'
  })
  .description('A list of the scale\'s notes');

const noteNamesRef = Joi.ref('...notes', {
  in: true,
  adjust: (notes: any[]) => notes.reduce((previous: any[], current: any) => {
    if (typeof current === 'object' && current.name) {
      previous.push(current.name);
    }
    return previous;
  }, []),
});

export const tuningSchema = Joi.object().keys({
  name: Joi.string().description('The tuning\'s name').optional(),
  description: Joi.string().description('A description of the tuning').optional(),
  id: Joi.string().description('A unique identifier for the tuning').required(),
  scales: Joi.array().items(Joi.object().keys({
    notes: notes.required(),
    reference: Joi.object().keys({
      frequency: frequency.description('The reference frequency - a number, optionally with " Hz" appended').required(),
      note: Joi.string().valid(noteNamesRef).description('The name of the note that should be mapped onto the reference frequency').optional(),
    }).unknown().description('A reference frequency that is used to map the note\'s frequency ratios to real frequencies values (ie., in Hz).\nCan be either a number (optionally appended with " Hz") or an object containing a frequency and an optional note that references one of the note names from the scale\'s notes list.\nIf no note name is provided, the reference frequency will be mapped to the frequency ratio "1".').required(),
    'repeat ratio': expression.description('The frequency ratio at which the scale\'s notes will repeat').optional(),
    repeat: expression.description('The frequency ratio at which the scale\'s notes will repeat').optional(),
    'max frequency': frequency.description('A maximum frequency for the scale.\nWhen mapping the scale\'s notes onto actual frequencies, notes from this scale will not be mapped above the provided frequency.').optional(),
    max: frequency.description('A maximum frequency for the scale.\nWhen mapping the scale\'s notes onto actual frequencies, notes from this scale will not be mapped above the provided frequency.').optional(),
    maximum: frequency.description('A maximum frequency for the scale.\nWhen mapping the scale\'s notes onto actual frequencies, notes from this scale will not be mapped above the provided frequency.').optional(),
    'min frequency': frequency.description('A minimum frequency for the scale.\nWhen mapping the scale\'s notes onto actual frequencies, notes from this scale will not be mapped below the provided frequency.').optional(),
    minimum: frequency.description('A minimum frequency for the scale.\nWhen mapping the scale\'s notes onto actual frequencies, notes from this scale will not be mapped below the provided frequency.').optional(),
    min: frequency.description('A minimum frequency for the scale.\nWhen mapping the scale\'s notes onto actual frequencies, notes from this scale will not be mapped below the provided frequency.').optional(),
    spectrum: Joi.string().description('The spectrum of the tones that should be used for this tuning.\nThis enables multiple, scale-dependent spectra to be used within a single tuning.').optional(),
  }).nand('repeat', 'repeat ratio')
    .oxor('min', 'minimum', 'min frequency')
    .oxor('max', 'maximum', 'max frequency')
    .unknown()
  ).min(1).description('List of scale objects').required()
}).unknown();

const partials = Joi.array().items(
  Joi.object().keys({
    'frequency ratio': expression.description('The partial\'s frequency ratio').optional(),
    ratio: expression.description('The partial\'s frequency ratio').optional(),
    'amplitude weight': expression.description('The partial\'s amplitude weight.\nThis determines how much the partial contributes to the overall power (ie., loudness) of the reconstructed spectrum.').optional(),
    weight: expression.description('The partial\'s amplitude weight.\nThis determines how much the partial contributes to the overall power (ie., loudness) of the reconstructed spectrum.').optional(),
  }).xor('frequency ratio', 'ratio')
    .xor('amplitude weight', 'weight')
    .unknown()
).min(1)
  .unique((a, b) => {
    const aRatio = a.ratio || a['frequency ratio'];
    const bRatio = b.ratio || b['frequency ratio'];

    if (aRatio && bRatio && aRatio === bRatio) {
      return true;
    }

    let evaluatedA;
    let evaluatedB;

    try {
      evaluatedA = evaluate(String(aRatio));
    } catch (ex) {
      return false;
    }

    try {
      evaluatedB = evaluate(String(bRatio));
    } catch (ex) {
      return false;
    }

    return evaluatedA === evaluatedB;
  })
  .messages({
    'array.unique': 'The partials array contains frequency ratios that evaluate to the same value: "{#value.ratio || #value.[frequency ratio]}", "{#dupeValue.ratio || #dupeValue.[frequency ratio]}"'
  })
  .description('A list of partials that should be used to reconstruct the spectrum');

export const spectrumSchema = Joi.object().keys({
  name: Joi.string().description('The spectrum\'s name').optional(),
  description: Joi.string().description('A description of the spectrum').optional(),
  id: Joi.string().description('A unique identifier for the spectrum').required(),
  'partial distribution': partials.optional(),
  partials: partials.optional()
}).xor('partials', 'partial distribution')
  .unknown();

export const setSchema = Joi.object().keys({
  id: Joi.string().description('A unique identifier for the set').required(),
  name: Joi.string().description('The set\'s name').optional(),
  description: Joi.string().description('A description of the set').optional(),
  members: Joi.array().items(Joi.object().keys({
    tuning: Joi.string().description('A reference of a tuning\'s ID').optional(),
    spectrum: Joi.string().description('A reference of a spectrum\'s ID').optional(),
    'override scale spectra': Joi.boolean().description('If true, the set\'s spectrum should be applied to all scales in the set\'s tuning, overriding any spectra that are references by the scales.').optional()
  }).unknown())
    .min(1)
    .description('A list of set member objects')
    .required()
}).unknown();

/**
 * Joi schema for validating TSON objects.
 *
 * Doesn't parse expressions, but does validate that expression strings only contain allowed substrings.
 */
export const tsonSchema = Joi.object().keys({
  tunings: Joi.array().items(tuningSchema)
    .min(1)
    .unique((a, b) => a.id && b.id && a.id === b.id)
    .description('List of tuning objects')
    .optional(),
  spectra: Joi.array().items(spectrumSchema)
    .min(1)
    .unique((a, b) => a.id && b.id && a.id === b.id)
    .description('A list of spectrum objects')
    .optional(),
  sets: Joi.array().items(setSchema)
    .min(1)
    .unique((a, b) => a.id && b.id && a.id === b.id)
    .description('A list of set objects')
    .optional()
}).or('tunings', 'spectra', 'sets')
  .unknown();

export const validationOptionsSchema = Joi.object().keys({
  includedIdsOnly: Joi.boolean().optional(),
  allowUnknown: Joi.boolean().optional()
});

export interface ValidationOptions {
  /**
   * If true, an error will be thrown when references to tuning or spectrum IDs can't be resolved
   */
  includedIdsOnly?: boolean,

  /**
   * If true, additional properties that aren't defined in the TSON standard will be allowed
   */
  allowUnknown?: boolean
}

/**
 * TSON syntax validation
 *
 * @param {TSON | string} input The TSON to validate
 * @param {ValidationOptions} options An object containing validation options
 * @param {boolean} options.includedIdsOnly (default: true) If true, an error will be thrown when references to tuning or spectrum IDs can't be resolved
 * @param {boolean} options.allowUnknown (default: true) If true, additional properties that aren't defined in the TSON standard will be allowed
 * @returns {boolean} True if valid
 */
export default function validate(
  input: TSON | string,
  options?: ValidationOptions,
): boolean {
  // Set defaults for undefined options
  options = Object.assign({
    includedIdsOnly: true,
    allowUnknown: true
  }, options);

  Joi.assert(options, validationOptionsSchema, 'Invalid ValidationOptions!\n');

  // Parse input if it's a YAML string
  const tson: TSON = typeof input === 'string' ? YAML.parse(input) : input;

  // Validate TSON syntax & values
  Joi.assert(tson, tsonSchema, 'Invalid TSON!\n', {
    allowUnknown: options.allowUnknown
  });

  if (options.includedIdsOnly) {
    // Ensure that tuning/spectrum ID references are internally resolvable
    const tuningIds: string[] = [];
    const spectrumIds: string[] = [];

    if (tson.spectra) {
      for (const spectrum of tson.spectra) {
        spectrumIds.push(spectrum.id);
      }
    }

    if (tson.tunings) {
      for (const tuning of tson.tunings) {
        tuningIds.push(tuning.id);

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

  return true;
}