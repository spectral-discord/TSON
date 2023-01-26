import { TSON } from './tson';
import validate from './validate';
import standardize from './standardize';
import { evaluate } from 'mathjs';

/**
 *  Reduced Partial Type Interface
 *
 *  This type is essentially the same as the regular Partial
 *  interface, except that frequencies ratios and amplitude
 *  weights are always numbers, and amplitude weights sum to 1.
 */
interface ReducedPartial {
  ratio: number,
  weight: number,
  [key: string]: unknown
}

/**
 *  Reduced Spectrum Type Interface
 *
 *  This type is essentially the same as the regular Spectrum
 *  interface, except that partial's frequencies ratios and
 *  amplitude weights are always numbers, and amplitude
 *  weights sum to 1.
 */
export interface ReducedSpectrum {
  id: string,
  name?: string,
  description?: string,
  partials: ReducedPartial[]
  [key: string]: unknown
}

/**
 *  Reduced Note Type Interface
 *
 *  This type is essentially the same as the regular Note
 *  interface, except that frequency ratios are always numbers.
 */
interface ReducedNote {
  name?: string,
  ratio: number
  [key: string]: unknown
}

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
interface ReducedScale {
  notes: ReducedNote[],
  reference: Reference,
  spectrum?: string,
  min?: number,
  max?: number,
  repeat?: number,
  [key: string]: unknown
}

/**
 *  Reduced Tuning Type Interface
 *
 *  This type is essentially the same as the regular Tuning
 *  interface, except that notes are always objects, and
 *  frequencies and ratios are always numbers.
 */
export interface ReducedTuning {
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
export interface ReducedTSON {
  spectra?: ReducedSpectrum[],
  sets?: Set[],
  tunings?: ReducedTuning[]
}

/**
 * Standardizes parameter keys, evaluates expressions, normalizes
 * partial amplitude weights, and removes 'Hz' from frequencies.
 *
 * @param {TSON} tson The TSON object to be reduced
 */
export default function reduce(tson: TSON): ReducedTSON {
  validate(tson);
  tson = standardize(tson);

  const reduced: ReducedTSON = {};

  if (tson.sets) {
    reduced.sets = tson.sets;
  }

  if (tson.spectra) {
    reduced.spectra = [];
    tson.spectra.forEach(spectrum =>  {
      const reducedSpectrum: ReducedSpectrum = {
        id: spectrum.id,
        partials: []
      };

      if (spectrum.description) {
        reducedSpectrum.description = spectrum.description;
      }

      if (spectrum.name) {
        reducedSpectrum.name = spectrum.name;
      }

      const totalWeight = spectrum.partials
        ?.map(partial => evaluate(String(partial.weight)))
        .reduce((a, b) => a + b, 0);

      spectrum.partials?.forEach(partial => {
        // Evaluate frequency ratio expressions
        const reducedPartial: ReducedPartial = {
          ratio: 0,
          weight: 0
        };

        try {
          const ratio = evaluate(String(partial.ratio));
          if (ratio > 0) {
            reducedPartial.ratio = ratio;
          } else throw new Error();
        } catch (ex) {
          throw new Error(`
            Error parsing expression string: "${partial.ratio}"
            Used for a partial's frequency ratio in spectrum: ${spectrum.name || spectrum.id}
            Frequency ratio expressions must evaluate to a positive number.
          `);
        }

        // Evaluate amplitude weight expressions & normalize
        try {
          const weight = evaluate(String(partial.weight));
          if (weight > 0) {
            reducedPartial.weight = weight / totalWeight;
          } else throw new Error();
        } catch (ex) {
          throw new Error(`
            Error parsing expression string: "${partial.weight}"
            Used for a partial's amplitude weight in spectrum: ${spectrum.name || spectrum.id}
            Amplitude weight expressions must evaluate to a positive number.
          `);
        }

        reducedSpectrum.partials.push(reducedPartial);
      });

      reducedSpectrum.partials.sort((a, b) => a.ratio - b.ratio);
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

        if (scale.min) {
          reducedScale.min = parseFloat(String(scale.min));
        }

        if (scale.max) {
          reducedScale.max = parseFloat(String(scale.max));
        }

        // Evaluate repeat ratio expressions
        if (scale.repeat) {
          try {
            const repeat = evaluate(String(scale.repeat));
            if (repeat > 0) {
              reducedScale.repeat = repeat;
            } else throw new Error();
          } catch (ex) {
            throw new Error(`
              Error parsing expression string: "${scale.repeat}"
              Used for a repeat ratio in tuning: ${tuning.name || tuning.id}
              Frequency ratio expressions must evaluate to a positive number.
            `);
          }
        }

        scale.notes.map(note => {
          // Evaluate note frequency ratio expressions
          if (typeof(note) === 'object') {
            try {
              const ratio = evaluate(String(note.ratio));
              if (ratio > 0) {
                reducedScale.notes.push({
                  ...(note.name && { name: note.name }),
                  ratio
                });
              } else throw new Error();
            } catch (ex) {
              throw new Error(`
                Error parsing expression string: "${note.ratio}"
                Used for a partial's frequency ratio in tuning: ${tuning.name || tuning.id}
                Frequency ratio expressions must evaluate to a positive number.
              `);
            }
          } else {
            try {
              const ratio = evaluate(String(note));
              if (ratio > 0) {
                reducedScale.notes.push({ ratio });
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

        reducedScale.notes.sort((a, b) => a.ratio - b.ratio);
        reducedTuning.scales.push(reducedScale);
      });

      reduced.tunings?.push(reducedTuning);
    });
  }

  return reduced;
}