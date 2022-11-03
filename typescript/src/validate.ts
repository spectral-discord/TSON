'use strict';

import { TSON } from './tson';
import * as Joi from 'joi';
import { evaluate } from 'mathjs';
import YAML from 'yaml';

const expression = Joi.alternatives().try(
  Joi.string().regex(/^([1234567890.+\-*/^%()e ]|(pi)|(tau)|(abs))+$/),
  Joi.number().positive(),
);

const frequency = Joi.alternatives().try(
  Joi.number().positive(),
  Joi.string().regex(/^(0*[1-9][0-9]*(\.[0-9]+)?|0+\.[0-9]*[1-9][0-9]*)( Hz)?$/)
);

const notes = Joi.array().items(
  expression,
  Joi.object().keys({
    'frequency ratio': expression.description('The note\'s frequency ratio').optional(),
    ratio: expression.description('The note\'s frequency ratio').optional(),
    name: Joi.string().description('The note\'s name').optional(),
  }).unknown().xor('frequency ratio', 'ratio')
).min(1)
  .unique((a, b) => {
    let aFreq;
    let bFreq;

    try {
      if (typeof(b) === 'object') {
        bFreq = evaluate(String(b['frequency ratio'] || b.ratio));
      } else {
        bFreq = evaluate(String(b));
      }
    } catch (ex) {
      throw new Error(`Error parsing expression string: "${(b.ratio || b['frequency ratio'])}"`);
    }

    try {
      if (typeof(a) === 'object') {
        aFreq = evaluate(String(a['frequency ratio'] || a.ratio));
      } else {
        aFreq = evaluate(String(a));
      }
    } catch (ex) {
      throw new Error(`Error parsing expression string: "${(a.ratio || a['frequency ratio'])}"`);
    }

    return aFreq === bFreq;
  })
  .description('A list of the scale\'s notes');

const noteNamesRef = Joi.ref('...notes', {
  in: true,
  adjust: (notes: any[]) => notes.reduce((previous: any[], current: any) => {
    if (typeof(current) === 'object' && current.name) {
      previous.push(current.name);
    }
    return previous;
  }, []),
});

const tunings = Joi.array().items(Joi.object().keys({
  name: Joi.string().description('The tuning system\'s name').optional(),
  description: Joi.string().description('A description of the tuning system').optional(),
  id: Joi.string().description('A unique identifier for the tuning system').required(),
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
    spectrum: Joi.string().description('The spectrum of the tones that should be used for this tuning.\nThis enables multiple, scale-dependent spectra to be used within a single tuning system.').optional(),
  }).nand('repeat', 'repeat ratio')
    .oxor('min', 'minimum', 'min frequency')
    .oxor('max', 'maximum', 'max frequency')
    .unknown()
  ).min(1).description('List of scale objects').required()
}).unknown())
  .min(1)
  .unique((a, b) => a.id && b.id && a.id === b.id)
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
).min(1)
  .unique((a, b) => {
    let aRatio;
    let bRatio;

    try {
      aRatio = evaluate(String(a.ratio || a['frequency ratio']));
    } catch (ex) {
      throw new Error(`Error parsing expression string: "${(a.ratio || a['frequency ratio'])}"`);
    }

    try {
      bRatio = evaluate(String(b.ratio || b['frequency ratio']));
    } catch (ex) {
      throw new Error(`Error parsing expression string: "${(a.ratio || a['frequency ratio'])}"`);
    }

    return aRatio === bRatio;
  })
  .description('A list of partials that should be used to reconstruct the spectrum');

const spectrumSchema = Joi.array().items(Joi.object().keys({
  name: Joi.string().description('The spectrum\'s name').optional(),
  description: Joi.string().description('A description of the spectrum').optional(),
  id: Joi.string().description('A unique identifier for the spectrum').required(),
  'partial distribution': partials.optional(),
  partials: partials.optional()
}).xor('partials', 'partial distribution')
  .unknown()
).min(1)
  .unique((a, b) => a.id && b.id && a.id === b.id)
  .description('A list of spectrum objects')
  .optional();

/**
 * Joi schema for validating TSON objects.
 *
 * Doesn't parse expressions, but does validate that expression strings only contain allowed substrings.
 */
export const tsonSchema = Joi.object().keys({
  'tuning systems': tunings,
  tunings,
  spectra: spectrumSchema,
  sets: Joi.array().items(Joi.object().keys({
    id: Joi.string().description('A unique identifier for the set').required(),
    name: Joi.string().description('The set\'s name').optional(),
    description: Joi.string().description('A description of the set').optional(),
    members: Joi.array().items(Joi.object().keys({
      'tuning system': Joi.string().description('A reference of a tuning system\'s ID').optional(),
      tuning: Joi.string().description('A reference of a tuning system\'s ID').optional(),
      spectrum: Joi.string().description('A reference of a spectrum\'s ID').optional(),
      'override scale spectra': Joi.boolean().description('If true, the set\'s spectrum should be applied to all scales in the set\'s tuning system, overriding any spectra that are references by the scales.').optional()
    }).nand('tuning system', 'tuning').unknown())
      .min(1)
      .unique((a, b) => a.id && b.id && a.id === b.id)
      .description('A list of set member objects')
      .required()
  }).unknown()).min(1).description('A list of set objects').optional()
}).nand('tuning systems', 'tunings')
  .or('tuning systems', 'tunings', 'spectra', 'sets')
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
  const tson: TSON = typeof(input) === 'string' ? YAML.parse(input) : input;

  // Validate TSON syntax & values
  Joi.assert(tson, tsonSchema, 'Invalid TSON!\n', {
    abortEarly: false,
    allowUnknown: options.allowUnknown
  });

  const tunings = tson.tunings || tson['tuning systems'];

  if (options.includedIdsOnly) {
    // Ensure that tuning/spectrum ID references are internally resolvable
    const tuningIds: string[] = [];
    const spectrumIds: string[] = [];

    if (tson.spectra) {
      for (const spectrum of tson.spectra) {
        spectrumIds.push(spectrum.id);
      }
    }

    if (tunings) {
      for (const tuning of tunings) {
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

  // Ensure that expressions can be evaluated
  if (tunings) {
    for (const tuning of tunings) {
      for (const scale of tuning.scales) {
        const repeat = scale.repeat || scale['repeat ratio'];
        if (repeat) {
          if (typeof(repeat) === 'string') {
            try {
              if (evaluate(repeat) <= 0) throw new Error();
            } catch (ex) {
              throw new Error(`
                Error parsing expression string: "${repeat}"
                Used for a repeat ratio in tuning: ${tuning.id}
                Frequency ratio expressions must evaluate to a positive number.
              `);
            }
          }
        }

        for (const note of scale.notes) {
          if (typeof(note) === 'string') {
            try {
              if (evaluate(note) <= 0) throw new Error();
            } catch (ex) {
              throw new Error(`
                Error parsing expression string: "${note}"
                Used for a note's frequency ratio in tuning: ${tuning.id}
                Frequency ratio expressions must evaluate to a positive number.
              `);
            }
          } else if (typeof(note) === 'object') {
            const ratio = note.ratio ? note.ratio : note['frequency ratio'];
            if (typeof(ratio) === 'string') {
              try {
                if (evaluate(ratio) <= 0) throw new Error();
              } catch (ex) {
                throw new Error(`
                  Error parsing expression string: "${ratio}"
                  Used for a partial's frequency ratio in tuning: ${tuning.id}
                  Frequency ratio expressions must evaluate to a positive number.
                `);
              }
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
          if (typeof(frequency) === 'string') {
            try {
              if (evaluate(frequency) <= 0) throw new Error();
            } catch (ex) {
              throw new Error(`
                Error parsing expression string: "${frequency}"
                Used for a partial's frequency ratio in spectrum: ${spectrum.id}
                Frequency ratio expressions must evaluate to a positive number.
              `);
            }
          }
          if (typeof(amplitude) === 'string') {
            try {
              if (evaluate(amplitude) <= 0) throw new Error();
            } catch (ex) {
              throw new Error(`
                Error parsing expression string: "${amplitude}"
                Used for a partial's amplitude weight in spectrum: ${spectrum.id}
                Amplitude weight expressions must evaluate to a positive number.
              `);
            }
          }
        }
      }
    }
  }

  return true;
}