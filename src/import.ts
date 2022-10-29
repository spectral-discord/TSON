'use strict';

import { Tuning } from './tson';
import Joi from 'joi';

function centsToExpression(cents: number): string {
  return `2^(${cents}/1200)`;
}

interface ScalaImportOptions {
  id: string,
  name?: string,
  referenceFrequency: number
}

export const fromScalaOptionsSchema = Joi.object().keys({
  id: Joi.string().required(),
  name: Joi.string().optional(),
  referenceFrequency: Joi.number().required()
});

/**
 * Imports a tuning from the Scala (.scl) format
 * @param {string} scala The Scala string to be imported
 * @param {ScalaImportOptions} options
 * @param {string} options.id An ID for the tuning
 * @param {string} [options.name] A name for the tuning
 * @param {number} options.referenceFrequency A reference frequency (in Hz) to use when building the tuning
 * @returns {Tuning} A tuning containing the converted scale
 */
export function fromScala(
  scala: string,
  options: ScalaImportOptions
): Tuning {
  Joi.assert(options, fromScalaOptionsSchema, 'Invalid ScalaImportOptions!\n');
  const { id, name, referenceFrequency } = options;

  const tuning: Tuning = {
    id,
    ...(name && { name }),
    scales: [ {
      notes: [],
      reference: {
        frequency: referenceFrequency
      }
    } ],
  };

  // Filter comment lines out
  const lines = scala.split('\n').filter(line => line.trim().indexOf('!') !== 0);

  if (lines[0].length > 0) {
    tuning.description = lines[0];
  }
  lines.shift();

  const numNotes = parseInt(lines[0].trim());

  if (typeof(numNotes) !== 'number' || lines.length < numNotes) {
    throw new Error(`Error in line ${scala.split('\n').indexOf(lines[0]) + 1}\nThis line should contain the number of notes, and there should be at least that many lines of notes.`);
  }

  lines.shift();

  tuning.scales[0].notes[0] = { ratio: 1 };

  for (let i = 0; i < numNotes; ++i) {
    const match = lines[i].trim().match(/(([0-9]+\.[0-9]*)|([0-9]+\/[0-9]+)|([0-9]+))( +.*)*/)?.[0];
    if (match && match.length === lines[i].length) {
      let note = lines[i].trim().match(/([0-9]+\.[0-9]*)|([0-9]+\/[0-9]+)|([0-9]+)/)?.[0];
      if (note) {
        note = note.includes('.') ? centsToExpression(parseFloat(note)) : note;
        if (i === numNotes - 1) {
          tuning.scales[0].repeat = note;
        } else {
          tuning.scales[0].notes[i + 1] = { ratio: note };
        }
      }
    } else {
      throw new Error(`Error in line ${scala.split('\n').indexOf(lines[i]) + 1}\nThe note string is invalid.`);
    }
  }

  return tuning;
}