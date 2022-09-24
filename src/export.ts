'use strict';

import { evaluate, round } from 'mathjs';
import { Scale } from './tson';

function ratioToCents(ratio: number): number {
  return round(1200 * Math.log2(ratio), 5);
  //return `${cents}`.includes('.') ? `${cents}` : `${cents}.`;
}

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

    return 0;
  });

  ratios = ratios.filter(ratio => ratio > 0);
  ratios.sort((a, b) => a - b);
  const preSub = ratios[0] - 1;
  ratios = ratios.map(ratio => preSub < 0 ? ratioToCents(ratio - (preSub * ratio)) : ratioToCents(ratio));
  const sub = preSub < 0 ? 0 : ratios[0];
  ratios.shift();

  const repeat = scale.repeat || scale['repeat ratio'];
  if (repeat) {
    const ratio = typeof(repeat) === 'string' ? evaluate(repeat) : repeat;
    const cents = preSub < 0 ? ratioToCents(ratio - (preSub * ratio)) : ratioToCents(ratio);
    if (cents > ratios[ratios.length - 1]) {
      ratios.push(cents);
    }
  }

  let scl = `${description ? description : ''}\n${ratios.length}`;
  ratios.forEach(ratio => {
    const cents = ratio - sub;
    const centsString = `${cents}`.includes('.') ? `${cents}` : `${cents}.`;
    scl += `\n${centsString}`;
  });

  return scl;
}