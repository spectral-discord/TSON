import { TSON, Tuning, Spectrum } from './tson';
import reduce, { ReducedSpectrum } from './reduce';
import { round } from 'mathjs';
import * as Joi from 'joi';

/**
 * Options for building tunings
 */
export interface BuildTuningOptions {
  /**
   * The global minimum frequency for the tuning, below which no notes will exist
   */
  globalMin?: number,

  /**
   * The global maximum frequency for the tuning, above which no notes will exist
   */
  globalMax?: number,

  /**
   * If true, referenced spectra will be added to the returned `BuiltNote` objects
   */
  includeSpectra?: boolean,

  /**
   * The `id` of a spectrum to apply to built notes by default
   */
  defaultSpectrumId?: string,

  /**
   * If true, a `defaultSpectrumId` must be provided, and will be used instead of any spectrum IDs referenced in scales
   */
  overrideScaleSpectra?: boolean,

  /**
   * If false, an error will be thrown when two notes have the same frequency
   */
  allowConflicts?: boolean,

  /**
   * The decimal precision of the returned note frequencies
   */
  precision?: number
}

export const buildTuningOptionsSchema = Joi.object().keys({
  globalMin: Joi.number().positive().required(),
  globalMax: Joi.number().positive().required(),
  precision: Joi.number().integer().positive().required(),
  includeSpectra: Joi.boolean().required(),
  allowConflicts: Joi.boolean().required(),
  overrideScaleSpectra: Joi.boolean().required(),
  defaultSpectrumId: Joi.when('overrideScaleSpectra', {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().optional()
  })
});

export interface BuiltNote {
  /**
   * The note's frequency in Hz
   */
  frequency: number,

  /**
   * The note's name
   */
  name?: string,

  /**
   * The note's spectrum
   */
  spectrum?: ReducedSpectrum
}

/**
 * Builds a tuning from its scale data
 *
 * @param tuning The tuning to build
 * @param spectra An array of spectra that are referenced by the scales or `options.defaultSpectrumId`
 * @param options An object containing build options
 * @returns An array of `BuiltNote` objects
 */
export default function buildTuning(
  tuning: Tuning,
  spectra?: Spectrum[],
  options?: BuildTuningOptions
): BuiltNote[] {
  options = Object.assign({
    globalMin: 10,
    globalMax: 24000,
    precision: 7,
    allowConflicts: false,
    includeSpectra: true,
    overrideScaleSpectra: false
  }, options);

  Joi.assert(options, buildTuningOptionsSchema, 'Invalid BuildTuningOptions!\n');

  if (options.defaultSpectrumId && !spectra?.find(spectrum => spectrum.id === options?.defaultSpectrumId)) {
    throw new Error('The `spectra` array doesn\'t include a spectrum with an ID that matches the provided `defaultSpectrumId`.');
  }

  const notes: BuiltNote[] = [];
  const tson = new TSON({
    tunings: [ tuning ],
    ...(spectra && { spectra })
  });
  const reduced = reduce(tson);
  const reducedTuning = reduced.tunings?.[0];
  const reducedSpectra = reduced.spectra;

  if (!reducedTuning) {
    throw new Error('Error while building tuning: Tuning not found');
  }

  reducedTuning.scales.forEach(scale => {
    // Determine whether to use the scale or global min/max settings
    const min = scale.min && options?.globalMin && scale.min > options?.globalMin
      ? scale.min
      : options?.globalMin;
    const max = scale.max && options?.globalMax && scale.max < options?.globalMax
      ? scale.max
      : options?.globalMax;

    // Set the reference frequency, calculating the root's frequency for convenience
    let referenceFreq = scale.reference.frequency;
    if (scale.reference.note) {
      const referenceNote = scale.notes.find(note => note.name === scale.reference.note);
      if (referenceNote?.ratio) {
        referenceFreq /= referenceNote.ratio;
      }
    }

    scale.notes.forEach(note => {
      if (note.ratio) {
        const freq = note.ratio * referenceFreq;
        const builtNote: BuiltNote = {
          frequency: round(freq, options?.precision),
          ...(note.name && { name: note.name }),
        };

        // Add a spectrum to the note if one exists
        if (options?.includeSpectra) {
          if (options?.defaultSpectrumId || scale.spectrum) {
            const spectrumId = (!options?.overrideScaleSpectra && scale.spectrum) || options?.defaultSpectrumId;
            const spectrum = reducedSpectra?.find(spectrum => spectrum.id === spectrumId);
            builtNote.spectrum = spectrum;
          }
        }

        // Add the built note to the notes array if it meets min/max/conflict criteria
        if (options?.allowConflicts || !notes.find(note => note.frequency === builtNote.frequency)) {
          if (
            (min && note.ratio * referenceFreq > min)
            && (max && note.ratio * referenceFreq < max)
          ) {
            notes.push(builtNote);
          }
        } else if (!options?.allowConflicts) {
          const problemNotes = [
            {
              name: builtNote.name,
              frequency: builtNote.frequency
            },
            {
              name: notes.find(note => note.frequency === builtNote.frequency)?.name,
              frequency: builtNote.frequency
            }
          ];

          throw new Error(`
            Conflicting note frequencies were found.
            To allow multiple notes with the same frequency, set 'allowConflicts' to true.
            Problem notes:
            ${JSON.stringify(problemNotes)}
          `);
        }

        if (scale.repeat) {
          // Add notes for scale iterations descending in frequency
          let lastFreq = freq;
          while (min && lastFreq / scale.repeat > min) {
            lastFreq /= scale.repeat;

            if (max && lastFreq < max) {
              if (
                options?.allowConflicts
                || !notes.find(note => note.frequency === lastFreq)
              ) {
                notes.push({
                  ...builtNote,
                  frequency: round(lastFreq, options?.precision)
                });
              } else if (!options?.allowConflicts) {
                const problemNotes = [
                  {
                    name: builtNote.name,
                    frequency: lastFreq
                  },
                  {
                    name: notes.find(note => note.frequency === lastFreq)?.name,
                    frequency: lastFreq
                  }
                ];

                throw new Error(`
                  Conflicting note frequencies were found.
                  To allow multiple notes with the same frequency, set 'allowConflicts' to true.
                  Problem notes:
                  ${JSON.stringify(problemNotes)}
                `);
              }
            }
          }

          // Add notes for scale iterations ascending in frequency
          lastFreq = freq;
          while (max && lastFreq * scale.repeat < max) {
            lastFreq *= scale.repeat;

            if (min && lastFreq > min) {
              if (
                options?.allowConflicts
                || !notes.find(note => note.frequency === lastFreq)
              ) {
                notes.push({
                  ...builtNote,
                  frequency: round(lastFreq, options?.precision)
                });
              } else if (!options?.allowConflicts) {
                const problemNotes = [
                  {
                    name: builtNote.name,
                    frequency: lastFreq
                  },
                  {
                    name: notes.find(note => note.frequency === lastFreq)?.name,
                    frequency: lastFreq
                  }
                ];

                throw new Error(`
                  Conflicting note frequencies were found.
                  To allow multiple notes with the same frequency, set 'allowConflicts' to true.
                  Problem notes:
                  ${JSON.stringify(problemNotes)}
                `);
              }
            }
          }
        }
      }
    });
  });

  return notes.sort((a, b) => a.frequency - b.frequency);
}