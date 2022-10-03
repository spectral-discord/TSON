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
  return JSON.parse(
    JSON.stringify(tson)
      .replace(options.tuningSystems === 'tunings' ? /("tuning systems":)/g : /("tunings":)/g, `"${options.tuningSystems}":`)
      .replace(options.repeatRatio === 'repeat' ? /("repeat ratio":)/g : /("repeat":)/g, `"${options.repeatRatio}":`)
      .replace(options.minFrequency === 'min' ? /("min frequency":)/g : /("min":)/g, `"${options.minFrequency}":`)
      .replace(options.maxFrequency === 'max' ? /("max frequency":)/g : /("max":)/g, `"${options.maxFrequency}":`)
      .replace(options.frequencyRatio === 'ratio' ? /("frequency ratio":)/g : /("ratio":)/g, `"${options.frequencyRatio}":`)
      .replace(options.amplitudeWeight === 'weight' ? /("amplitude weight":)/g : /("weight":)/g, `"${options.amplitudeWeight}":`)
      .replace(options.partialDistribution === 'partials' ? /("partial distribution":)/g : /("partials":)/g, `"${options.partialDistribution}":`)
  );
}
