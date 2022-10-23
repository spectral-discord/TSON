'use strict';

import { TSON } from './tson';

export interface StandardizationOptions {
  tuningSystems: 'tuning systems' | 'tunings',
  repeatRatio: 'repeat' | 'repeat ratio',
  minFrequency: 'min' | 'minimum' | 'min frequency',
  maxFrequency: 'max' | 'maximum' | 'max frequency',
  frequencyRatio: 'frequency ratio' | 'ratio',
  amplitudeWeight: 'amplitude weight' | 'weight',
  partialDistribution: 'partials' | 'partial distribution',
}

export default function standardize(
  tson: TSON,
  options?: StandardizationOptions
): TSON {
  // TODO: Add validations for options everywhere
  options = Object.assign({
    tuningSystems: 'tunings',
    repeatRatio: 'repeat',
    minFrequency: 'min',
    maxFrequency: 'max',
    frequencyRatio: 'ratio',
    amplitudeWeight: 'weight',
    partialDistribution: 'partials',
  }, options);

  return JSON.parse(
    JSON.stringify(tson)
      .replace(options.tuningSystems === 'tunings' ? /("tuning systems":)/g : /("tunings":)/g, `"${options.tuningSystems}":`)
      .replace(options.repeatRatio === 'repeat' ? /("repeat ratio":)/g : /("repeat":)/g, `"${options.repeatRatio}":`)
      .replace(options.minFrequency === 'min'
        ? /("min frequency":)|("minimum":)/g
        : options.minFrequency === 'minimum'
          ? /("min":)|("min frequency":)/g
          : /("min":)|("minimum":)/g, `"${options.minFrequency}":`)
      .replace(options.maxFrequency === 'max'
        ? /("max frequency":)|("maximum":)/g
        : options.maxFrequency === 'maximum'
          ? /("max frequency":)|("max":)/g
          : /("max":)|("maximum":)/g, `"${options.maxFrequency}":`)
      .replace(options.frequencyRatio === 'ratio' ? /("frequency ratio":)/g : /("ratio":)/g, `"${options.frequencyRatio}":`)
      .replace(options.amplitudeWeight === 'weight' ? /("amplitude weight":)/g : /("weight":)/g, `"${options.amplitudeWeight}":`)
      .replace(options.partialDistribution === 'partials' ? /("partial distribution":)/g : /("partials":)/g, `"${options.partialDistribution}":`)
  );
}
