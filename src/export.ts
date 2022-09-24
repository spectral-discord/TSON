'use strict';

import { evaluate } from 'mathjs';
import { Scale } from './tson';

function ratioToCents(ratio: number): number {
  return 1200 * Math.log2(ratio);
}

export function toScala(scale: Scale, description?: string) {
  let scl = `${description ? description : ''}\n${scale.notes.length}`;

  let notes: number[] = scale.notes.map(note => {
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

  notes = notes.filter(note => note > 0);
  notes.sort((a, b) => a - b);
  const sub = notes[0] - 1;
  notes.shift();
  notes.forEach(note => scl += `\n${ratioToCents(note - sub)}`);

  const repeat = scale.repeat || scale['repeat ratio'];
  if (repeat) {
    const ratio = typeof(repeat) === 'string' ? evaluate(repeat) : repeat;
    if (ratio > notes[notes.length - 1]) {
      scl += `\n${ratioToCents(ratio - sub)}`;
    }
  }

  return scl;
}