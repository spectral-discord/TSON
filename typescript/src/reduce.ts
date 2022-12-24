import { TSON } from './tson';
import validate from './validate';
import standardize, { StandardizationOptions } from './standardize';
import { evaluate } from 'mathjs';

/**
 *  Reduced Partial Type Interface
 *
 *  This type is essentially the same as the regular Partial
 *  interface, except that frequencies ratios and amplitude
 *  weights are always numbers, and amplitude weights sum to 1.
 */
type ReducedPartial = {
  [key: string]: unknown
} & (
  { 'frequency ratio'?: number, ratio?: never }
    | { 'frequency ratio'?: never, ratio?: number }
) & (
  { weight?: number, 'amplitude weight'?: never }
    | { weight?: never, 'amplitude weight'?: number }
)

/**
 *  Reduced Spectrum Type Interface
 *
 *  This type is essentially the same as the regular Spectrum
 *  interface, except that partial's frequencies ratios and
 *  amplitude weights are always numbers, and amplitude
 *  weights sum to 1.
 */
export type ReducedSpectrum = {
  id: string,
  name?: string,
  description?: string,
  [key: string]: unknown
} & (
  { partials?: ReducedPartial[], 'partial distribution'?: never }
    | { partials?: never, 'partial distribution'?: ReducedPartial[] }
);

/**
 *  Reduced Note Type Interface
 *
 *  This type is essentially the same as the regular Note
 *  interface, except that frequency ratios are always numbers.
 */
type ReducedNote = {
  name?: string,
  [key: string]: unknown
} & (
  { 'frequency ratio'?: number, ratio?: never }
    | { 'frequency ratio'?: never, ratio?: number }
)

interface Reference {
  frequency: number,
  note?: string,
  [key: string]: unknown
}

/**
 *  Reduced Scale Type Interface
 *
 *  This type is essentially the same as the regular Scale
 *  interface, except that notes are always objects, and
 *  frequencies and ratios are always numbers.
 */
type ReducedScale = {
  notes: ReducedNote[],
  reference: Reference,
  spectrum?: string,
  [key: string]: unknown
} & (
  { min?: number, minimum?: never, 'min frequency'?: never }
    | { min?: never, minimum?: number, 'min frequency'?: never }
    | { min?: never, minimum?: never, 'min frequency'?: number }
) & (
  { max?: number, maximum?: never , 'max frequency'?: never }
    | { max?: never, maximum?: number , 'max frequency'?: never }
    | { max?: never, maximum?: never , 'max frequency'?: number }
) & (
  { repeat?: number, 'repeat ratio'?: never }
    | { repeat?: never, 'repeat ratio'?: number }
);

/**
 *  Reduced Tuning Type Interface
 *
 *  This type is essentially the same as the regular Tuning
 *  interface, except that notes are always objects, and
 *  frequencies and ratios are always numbers.
 */
interface ReducedTuning {
  id: string,
  name?: string,
  description?: string,
  scales: ReducedScale[],
  [key: string]: unknown
}

type SetMember = {
  spectrum?: string,
  'override scale spectra'?: boolean
  tuning?: string,
  [key: string]: unknown
}

interface Set {
  id: string,
  name?: string,
  description?: string,
  members: SetMember[],
  [key: string]: unknown
}

/**
 *  Reduced TSON Type Interface
 *
 *  This type is essentially the same as the regular TSON
 *  interface, except that notes are always objects, and
 *  frequencies, ratios, and weights are always numbers.
 */
type ReducedTSON = {
  spectra?: ReducedSpectrum[],
  sets?: Set[],
  tunings?: ReducedTuning[]
}

/**
 * Standardizes parameter keys, evaluates expressions, normalizes
 * partial amplitude weights, and removes 'Hz' from frequencies.
 *
 * @param {TSON} tson The TSON object to be reduced
 * @param {StandardizationOptions} standardizationOptions An object containing parameter key preferences
 * @param {string} standardizationOptions.repeatRatio One of: [ 'repeat', 'repeat ratio' ]
 * @param {string} standardizationOptions.minFrequency One of: [ 'min', 'minimum', 'min frequency' ]
 * @param {string} standardizationOptions.maxFrequency One of: [ 'max', 'maximum', 'max frequency' ]
 * @param {string} standardizationOptions.frequencyRatio One of: [ 'ratio', 'frequency ratio' ]
 * @param {string} standardizationOptions.amplitudeWeight One of: [ 'weight', 'amplitude weight' ]
 * @param {string} standardizationOptions.partialDistribution One of: [ 'partials', 'partial distribution' ]
 */
export default function reduce(
  tson: TSON,
  standardizationOptions: StandardizationOptions = {
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
        const reducedPartial: ReducedPartial = {};

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

  if (tson.tunings) {
    reduced.tunings = [];
    tson.tunings?.forEach(tuning => {
      const reducedTuning: ReducedTuning = { ...tuning, scales: [] };
      tuning.scales.forEach(scale => {
        const reducedScale: ReducedScale = {
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
                const reducedNote: ReducedNote = {
                  ...(note.name && { name: note.name })
                };
                reducedNote[ratioPref] = ratio;

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
                const reducedNote: ReducedNote = {};
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

      reduced.tunings?.push(reducedTuning);
    });
  }

  return reduced;
}