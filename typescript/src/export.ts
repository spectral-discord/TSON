'use strict';

import { evaluate, round } from 'mathjs';
import YAML from 'yaml';
import { Scale, TSON } from './tson';

function ratioToCents(ratio: number): number {
  return round(1200 * Math.log2(ratio), 5);
}

/**
 * Exports a scale to the Scala (.scl) format
 * @param {Scale} scale The scale to be exported
 * @param {string} description A description of the scale
 * @returns {string} A string containing the scale in Scala format
 */
export function toScala(scale: Scale, description?: string) {
  let ratios: number[] = scale.notes.map(note => {
    if (typeof(note) === 'object') {
      const ratio = note['frequency ratio'] || note.ratio;
      if (ratio) {
        return typeof(ratio) === 'string' ? evaluate(ratio) : ratio;
      }
    } else {
      return typeof(note) === 'string' ? evaluate(note) : note;
    }
  });

  ratios = ratios.filter(ratio => ratio > 0);
  ratios.sort((a, b) => a - b);
  const preSub = ratios[0] - 1;
  ratios = ratios.map(ratio => preSub < 0 ? ratioToCents(ratio - (preSub * ratio)) : ratioToCents(ratio));
  const sub = preSub < 0 ? 0 : ratios[0];
  ratios.shift();

  const notesInCents = [];
  ratios.forEach(ratio => {
    const cents = ratio - sub;
    notesInCents.push(`${cents}${`${cents}`.includes('.') ? '' : '.'}`);
  });

  const repeat = scale.repeat || scale['repeat ratio'];
  if (repeat) {
    const ratio = typeof(repeat) === 'string' ? evaluate(repeat) : repeat;
    const cents = preSub < 0 ? ratioToCents(ratio - (preSub * ratio)) : ratioToCents(ratio);
    if (cents > ratios[ratios.length - 1]) {
      notesInCents.push(`${cents}${`${cents}`.includes('.') ? '' : '.'}`);
    }
  }

  return `${description || ''}\n${notesInCents.length}\n${notesInCents.join('\n')}`;
}

/**
 * Exports a TSON object to YAML string
 * @param {TSON} tson The TSON to be exported
 * @returns {string} A YAML string of the TSON data
 */
export function toTson(tson: TSON): string {
  return YAML.stringify({
    ...(tson.tunings && { tunings: tson.tunings }),
    ...(tson.spectra && { spectra: tson.spectra }),
    ...(tson.sets && { sets: tson.sets }),
  });
}