'use strict';

import { TSON } from './tson';
import * as Joi from 'joi';

/**
 * Standardization Options
 */
export interface StandardizationOptions {
  tuningSystems: 'tuning systems' | 'tunings',
  repeatRatio: 'repeat' | 'repeat ratio',
  minFrequency: 'min' | 'minimum' | 'min frequency',
  maxFrequency: 'max' | 'maximum' | 'max frequency',
  frequencyRatio: 'frequency ratio' | 'ratio',
  amplitudeWeight: 'amplitude weight' | 'weight',
  partialDistribution: 'partials' | 'partial distribution',
}

export const standardizationOptionsSchema = Joi.object().keys({
  tuningSystems: Joi.string().valid('tuning systems', 'tunings').required(),
  repeatRatio: Joi.string().valid('repeat', 'repeat ratio').required(),
  minFrequency: Joi.string().valid('min', 'minimum', 'min frequency').required(),
  maxFrequency: Joi.string().valid('max', 'maximum', 'max frequency').required(),
  frequencyRatio: Joi.string().valid('frequency ratio', 'ratio').required(),
  amplitudeWeight: Joi.string().valid('amplitude weight', 'weight').required(),
  partialDistribution: Joi.string().valid('partials', 'partial distribution').required()
});

/**
 * Standardizes parameter names throughout the provided TSON
 *
 * @param {TSON} tson The TSON to standardize
 * @param {StandardizationOptions} options Parameter name preferences to use
 * @returns {TSON} The standardized TSON
 */
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
  Joi.assert(options, standardizationOptionsSchema, 'Invalid standardization options!\n');

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
