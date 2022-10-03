import { TSON } from './tson';
import standardize, { StandardizationOptions } from './standardize';
import { evaluate } from 'mathjs';

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
): TSON {
  tson = standardize(tson, standardizationOptions);

  const tuningsPref = standardizationOptions.tuningSystems;
  const minPref = standardizationOptions.minFrequency;
  const maxPref = standardizationOptions.maxFrequency;
  const repeatPref = standardizationOptions.repeatRatio;
  const ratioPref = standardizationOptions.frequencyRatio;
  const weightPref = standardizationOptions.amplitudeWeight;
  const partialsPref = standardizationOptions.partialDistribution;

  if (tson[tuningsPref]) {
    tson[tuningsPref] = tson[tuningsPref]?.map(tuning => {
      tuning.scales = tuning.scales.map(scale => {
        // Remove 'Hz' from reference, min, & max
        if (typeof(scale.reference) === 'object') {
          scale.reference.frequency = parseFloat(String(scale.reference.frequency));
        } else {
          scale.reference = parseFloat(String(scale.reference));
        }

        if (scale[minPref]) {
          scale[minPref] = parseFloat(String(scale[minPref]));
        }

        if (scale[maxPref]) {
          scale[minPref] = parseFloat(String(scale[maxPref]));
        }

        // Evaluate repeat ratio expressions
        if (scale[repeatPref]) {
          try {
            const repeat = evaluate(String(scale[repeatPref]));
            if (repeat > 0) {
              scale[repeatPref] = repeat;
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
                note[ratioPref] = ratio;
              } else throw new Error();
            } catch (ex) {
              throw new Error(`
                Error parsing expression string: "${note[ratioPref]}"
                Used for a partial's frequency ratio in tuning: ${tuning.name || tuning.id}
                Frequency ratio expressions must evaluate to a positive number.
              `);
            }

            return note;
          } else {
            try {
              const ratio = evaluate(String(note));
              if (ratio > 0) {
                return ratio;
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

        return scale;
      });

      return tuning;
    });
  }

  if (tson.spectra) {
    tson.spectra = tson.spectra.map(spectrum =>  {
      const totalWeight = spectrum[partialsPref]
        ?.map(partial => evaluate(String(partial[weightPref])))
        .reduce((a, b) => a + b, 0);

      spectrum[partialsPref] = spectrum[partialsPref]?.map(partial => {
        // Evaluate frequency ratio expressions
        try {
          const ratio = evaluate(String(partial[ratioPref]));
          if (ratio > 0) {
            partial[ratioPref] = ratio;
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
            partial[weightPref] = weight / totalWeight;
          } else throw new Error();
        } catch (ex) {
          throw new Error(`
            Error parsing expression string: "${partial[weightPref]}"
            Used for a partial's amplitude weight in spectrum: ${spectrum.name || spectrum.id}
            Amplitude weight expressions must evaluate to a positive number.
          `);
        }

        return partial;
      });

      return spectrum;
    });
  }

  return tson;
}