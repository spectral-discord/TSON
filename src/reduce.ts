import { TSON } from './tson';
import validate from './validate';
import standardize, { StandardizationOptions } from './standardize';
import { evaluate } from 'mathjs';

interface Partial {
  'frequency ratio'?: number,
  ratio?: number,
  'amplitude weight'?: number,
  weight?: number
}

export interface ReducedSpectrum {
  id: string,
  name?: string,
  description?: string,
  partials?: Partial[],
  'partial distribution'?: Partial[]
}

interface Note {
  'frequency ratio'?: number,
  ratio?: number,
  name?: string
}

interface Reference {
  frequency: number,
  note?: string
}

interface Scale {
  notes: Note[],
  reference: Reference,
  'repeat ratio'?: number,
  repeat?: number,
  'max frequency'?: number,
  maximum?: number,
  max?: number,
  'min frequency'?: number,
  minimum?: number,
  min?: number,
  spectrum?: string,
}

interface Tuning {
  id: string,
  name?: string,
  description?: string,
  scales: Scale[]
}

interface SetMember {
  'tuning system': string,
  tuning: string,
  spectrum: string,
  'override scale spectra': boolean
}

interface Set {
  id: string,
  name?: string,
  description?: string,
  members: SetMember[]
}

/**
 *  Reduced TSON Type Interface
 *
 *  This type interface is basically the same as the regular
 *  TSON interface, except that notes are always objects, and
 *  frequencies, ratios, and weights are always numbers.
 */
interface ReducedTSON {
  tunings?: Tuning[],
  'tuning systems'?: Tuning[],
  spectra?: ReducedSpectrum[],
  sets?: Set[]
}

/**
 * Standardizes variable names, evaluates expressions, normalizes spectra amplitude weights, and removes 'Hz' from frequencies
 */
export default function reduce(
  tson: TSON,
  standardizationOptions: StandardizationOptions = {
    tuningSystems: 'tunings',
    repeatRatio: 'repeat',
    minFrequency: 'min',
    maxFrequency: 'max',
    frequencyRatio: 'ratio',
    amplitudeWeight: 'weight',
    partialDistribution: 'partials',
  }
): ReducedTSON {
  validate(tson);
  tson = standardize(tson, standardizationOptions);

  const reduced: ReducedTSON = {};

  if (tson.sets) {
    reduced.sets = tson.sets;
  }

  const tuningsPref = standardizationOptions.tuningSystems;
  const minPref = standardizationOptions.minFrequency;
  const maxPref = standardizationOptions.maxFrequency;
  const repeatPref = standardizationOptions.repeatRatio;
  const ratioPref = standardizationOptions.frequencyRatio;
  const weightPref = standardizationOptions.amplitudeWeight;
  const partialsPref = standardizationOptions.partialDistribution;

  if (tson.spectra) {
    reduced.spectra = [];
    tson.spectra.forEach(spectrum =>  {
      const reducedSpectrum: ReducedSpectrum = { id: spectrum.id };
      reducedSpectrum[partialsPref] = [];

      if (spectrum.description) {
        reducedSpectrum.description = spectrum.description;
      }

      if (spectrum.name) {
        reducedSpectrum.name = spectrum.name;
      }

      const totalWeight = spectrum[partialsPref]
        ?.map(partial => evaluate(String(partial[weightPref])))
        .reduce((a, b) => a + b, 0);

      spectrum[partialsPref]?.forEach(partial => {
        // Evaluate frequency ratio expressions
        const reducedPartial: Partial = {};

        try {
          const ratio = evaluate(String(partial[ratioPref]));
          if (ratio > 0) {
            reducedPartial[ratioPref] = ratio;
          } else throw new Error();
        } catch (ex) {
          throw new Error(`
            Error parsing expression string: "${partial[ratioPref]}"
            Used for a partial's frequency ratio in spectrum: ${spectrum.name || spectrum.id}
            Frequency ratio expressions must evaluate to a positive number.
          `);
        }

        // Evaluate amplitude weight expressions & normalize
        try {
          const weight = evaluate(String(partial[weightPref]));
          if (weight > 0) {
            reducedPartial[weightPref] = weight / totalWeight;
          } else throw new Error();
        } catch (ex) {
          throw new Error(`
            Error parsing expression string: "${partial[weightPref]}"
            Used for a partial's amplitude weight in spectrum: ${spectrum.name || spectrum.id}
            Amplitude weight expressions must evaluate to a positive number.
          `);
        }

        reducedSpectrum[partialsPref]?.push(reducedPartial);
      });

      reducedSpectrum[partialsPref]?.sort((a, b) => (a[ratioPref] || 0) - (b[ratioPref] || 0));
      reduced.spectra?.push(reducedSpectrum);
    });
  }

  if (tson[tuningsPref]) {
    reduced[tuningsPref] = [];
    tson[tuningsPref]?.forEach(tuning => {
      const reducedTuning: Tuning = { ...tuning, scales: [] };
      tuning.scales.forEach(scale => {
        const reducedScale: Scale = {
          notes: [],
          reference: { frequency: 0 },
          ...(scale.spectrum && { spectrum: scale.spectrum })
        };

        // Remove 'Hz' from reference, min, & max
        reducedScale.reference.frequency = parseFloat(String(scale.reference.frequency));

        if (scale.reference.note) {
          reducedScale.reference.note = scale.reference.note;
        }

        if (scale[minPref]) {
          reducedScale[minPref] = parseFloat(String(scale[minPref]));
        }

        if (scale[maxPref]) {
          reducedScale[maxPref] = parseFloat(String(scale[maxPref]));
        }

        // Evaluate repeat ratio expressions
        if (scale[repeatPref]) {
          try {
            const repeat = evaluate(String(scale[repeatPref]));
            if (repeat > 0) {
              reducedScale[repeatPref] = repeat;
            } else throw new Error();
          } catch (ex) {
            throw new Error(`
              Error parsing expression string: "${scale[repeatPref]}"
              Used for a repeat ratio in tuning: ${tuning.name || tuning.id}
              Frequency ratio expressions must evaluate to a positive number.
            `);
          }
        }

        scale.notes.map(note => {
          // Evaluate note frequency ratio expressions
          if (typeof(note) === 'object') {
            try {
              const ratio = evaluate(String(note[ratioPref]));
              if (ratio > 0) {
                const reducedNote: Note = {};
                reducedNote[ratioPref] = ratio;

                if (note.name) {
                  reducedNote.name = note.name;
                }

                reducedScale.notes.push(reducedNote);
              } else throw new Error();
            } catch (ex) {
              throw new Error(`
                Error parsing expression string: "${note[ratioPref]}"
                Used for a partial's frequency ratio in tuning: ${tuning.name || tuning.id}
                Frequency ratio expressions must evaluate to a positive number.
              `);
            }
          } else {
            try {
              const ratio = evaluate(String(note));
              if (ratio > 0) {
                const reducedNote: Note = {};
                reducedNote[ratioPref] = ratio;
                reducedScale.notes.push(reducedNote);
              } else throw new Error();
            } catch (ex) {
              throw new Error(`
                Error parsing expression string: "${note}"
                Used for a note's frequency ratio in tuning: ${tuning.name || tuning.id}
                Frequency ratio expressions must evaluate to a positive number.
              `);
            }
          }
        });

        reducedScale.notes.sort((a, b) => (a[ratioPref] || 0) - (b[ratioPref] || 0));
        reducedTuning.scales.push(reducedScale);
      });

      reduced[tuningsPref]?.push(reducedTuning);
    });
  }

  return reduced;
}