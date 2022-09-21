'use strict';

import { TSON } from './tson';

export interface StandardizationOptions {
  tuningSystems: 'tuning systems' | 'tunings',
  repeatRatio: 'repeat' | 'repeat ratio',
  minFrequency: 'min' | 'min frequency',
  maxFrequency: 'max' | 'max frequency',
  frequencyRatio: 'frequency ratio' | 'ratio',
  amplitudeWeight: 'amplitude weight' | 'weight',
  partialDistribution: 'partials' | 'partial distribution',
}

export default function standardize(
  tson: TSON,
  options: StandardizationOptions = {
    tuningSystems: 'tunings',
    repeatRatio: 'repeat',
    minFrequency: 'min',
    maxFrequency: 'max',
    frequencyRatio: 'ratio',
    amplitudeWeight: 'weight',
    partialDistribution: 'partials',
  }
): TSON {
  const standardized = tson;

  if (tson.tunings && options.tuningSystems === 'tuning systems') {
    standardized['tuning systems'] = standardized.tunings;
    delete standardized.tunings;
  } else if (tson['tuning systems'] && options.tuningSystems === 'tunings') {
    standardized.tunings = standardized['tuning systems'];
    delete standardized['tuning systems'];
  }

  if (standardized[options.tuningSystems]) {
    for (const tuning of standardized[options.tuningSystems] || []) {
      for (const scale of tuning.scales) {
        if (scale.repeat && options.repeatRatio === 'repeat ratio') {
          scale['repeat ratio'] = scale.repeat;
          delete scale.repeat;
        } else if (scale['repeat ratio'] && options.repeatRatio === 'repeat') {
          scale.repeat = scale['repeat ratio'];
          delete scale['repeat ratio'];
        }

        if (scale.min && options.minFrequency === 'min frequency') {
          scale['min frequency'] = scale.min;
          delete scale.min;
        } else if (scale['min frequency'] && options.minFrequency === 'min') {
          scale.min = scale['min frequency'];
          delete scale['min frequency'];
        }

        if (scale.max && options.maxFrequency === 'max frequency') {
          scale['max frequency'] = scale.max;
          delete scale.max;
        } else if (scale['max frequency'] && options.maxFrequency === 'max') {
          scale.max = scale['max frequency'];
          delete scale['max frequency'];
        }

        for (const note of scale.notes) {
          if (typeof(note) === 'object') {
            if (note.ratio && options.frequencyRatio === 'frequency ratio') {
              note['frequency ratio'] = note.ratio;
              delete note.ratio;
            } else if (note['frequency ratio'] && options.frequencyRatio === 'ratio') {
              note.ratio = note['frequency ratio'];
              delete note['frequency ratio'];
            }
          }
        }
      }
    }
  }

  if (standardized.spectra) {
    for (const spectrum of standardized.spectra) {
      if (spectrum.partials && options.partialDistribution === 'partial distribution') {
        spectrum['partial distribution'] = spectrum.partials;
        delete spectrum.partials;
      } else if (spectrum['partial distribution'] && options.partialDistribution === 'partials') {
        spectrum.partials = spectrum['partial distribution'];
        delete spectrum['partial distribution'];
      }

      for (const partial of spectrum[options.partialDistribution] || []) {
        if (partial.ratio && options.frequencyRatio === 'frequency ratio') {
          partial['frequency ratio'] = partial.ratio;
          delete partial.ratio;
        } else if (partial['frequency ratio'] && options.frequencyRatio === 'ratio') {
          partial.ratio = partial['frequency ratio'];
          delete partial['frequency ratio'];
        }

        if (partial.weight && options.amplitudeWeight === 'amplitude weight') {
          partial['amplitude weight'] = partial.weight;
          delete partial.weight;
        } else if (partial['amplitude weight'] && options.amplitudeWeight === 'weight') {
          partial.weight = partial['amplitude weight'];
          delete partial['amplitude weight'];
        }
      }
    }
  }

  return standardized;
}
