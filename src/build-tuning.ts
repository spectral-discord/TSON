import { TSON, Tuning, Spectrum } from './tson';
import reduce, { ReducedSpectrum } from './reduce';
import { round } from 'mathjs';
import * as Joi from 'joi';

interface BuildTuningOptions {
  globalMin?: number,
  globalMax?: number,
  includeSpectra?: boolean,
  defaultSpectrumId?: string,
  overrideScaleSpectra?: boolean,
  allowConflicts?: boolean,
  precision?: number
}

export const buildTuningOptionsSchema = Joi.object().keys({
  globalMin: Joi.number().required(),
  globalMax: Joi.number().required(),
  precision: Joi.number().required(),
  includeSpectra: Joi.boolean().required(),
  allowConflicts: Joi.boolean().required(),
  overrideScaleSpectra: Joi.boolean().required(),
  defaultSpectrumId: Joi.when('overrideScaleSpectra', {
    is: true,
    then: Joi.string().required(),
    otherwise: Joi.string().optional()
  })
});

interface Note {
  frequency: number,
  name?: string,
  spectrum?: ReducedSpectrum
}

export default function buildTuning(
  tuning: Tuning,
  spectra?: Spectrum[],
  options?: BuildTuningOptions
): Note[] {
  options = Object.assign({
    globalMin: 10,
    globalMax: 24000,
    precision: 7,
    allowConflicts: false,
    includeSpectra: true,
    overrideScaleSpectra: false
  }, options);

  Joi.assert(options, buildTuningOptionsSchema, 'Invalid build tuning options!');

  if (options.defaultSpectrumId && !spectra?.find(spectrum => spectrum.id === options?.defaultSpectrumId)) {
    throw new Error('The `spectra` array doesn\'t include a spectrum with an ID that matches the provided `defaultSpectrumId`.');
  }

  const notes: Note[] = [];
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
      if (
        note.ratio
        && (min && note.ratio * referenceFreq > min)
        && (max && note.ratio * referenceFreq < max)
      ) {
        const freq = note.ratio * referenceFreq;
        const builtNote: Note = {
          frequency: round(freq, options?.precision),
          ...(note.name && { name: note.name }),
        };

        if (options?.includeSpectra) {
          if (options?.defaultSpectrumId || scale.spectrum) {
            const spectrumId = (!options?.overrideScaleSpectra && scale.spectrum) || options?.defaultSpectrumId;
            const spectrum = reducedSpectra?.find(spectrum => spectrum.id === spectrumId);
            builtNote.spectrum = spectrum;
          }
        }

        if (
          options?.allowConflicts
          || !notes.find(note => note.frequency === builtNote.frequency)
        ) {
          notes.push(builtNote);
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

          // Add notes for scale iterations ascending in frequency
          lastFreq = freq;
          while (max && lastFreq * scale.repeat < max) {
            lastFreq *= scale.repeat;

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
    });
  });

  return notes.sort((a, b) => a.frequency - b.frequency);
}