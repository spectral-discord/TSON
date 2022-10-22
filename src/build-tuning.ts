import { TSON, Tuning, Spectrum } from './tson';
import reduce from './reduce';

interface BuildTuningOptions {
  globalMin?: number,
  globalMax?: number,
  forcedSpectrum?: Spectrum
}

interface Note {
  frequency: number,
  name?: string,
  spectrum?: Spectrum
}

export default function buildTuning(
  tuning: Tuning,
  options?: BuildTuningOptions
): Note[] {
  options = Object.assign({ globalMin: 10, globalMax: 24000 }, options);

  const notes: Note[] = [];
  const tson = new TSON({ tunings: [ tuning ] });
  const reduced = reduce(tson).tunings?.[0];

  if (!reduced) {
    throw new Error('Error while building tuning: Tuning not found');
  }

  reduced.scales.forEach(scale => {
    const min = scale.min && options?.globalMin && scale.min > options?.globalMin
      ? scale.min
      : options?.globalMin;
    const max = scale.max && options?.globalMax && scale.max < options?.globalMax
      ? scale.max
      : options?.globalMax;

    let referenceFreq = scale.reference.frequency;
    if (scale.reference.note) {
      const referenceNote = scale.notes.find(note => note.name === scale.reference.note);
      if (referenceNote?.ratio) {
        referenceFreq /= referenceNote.ratio;
      }
    }

    scale.notes.forEach(note => {
      if (
        note.ratio
        && (min && note.ratio * referenceFreq > min)
        && (max && note.ratio * referenceFreq < max)
      ) {
        const builtNote: Note = { frequency: note.ratio * referenceFreq };

        if (note.name) {
          builtNote.name = note.name;
        }

        // TODO: Add spectrum object to note
        // if (options?.forcedSpectrum || scale.spectrum) {
        //   builtNote.spectrum = options?.forcedSpectrum || scale.spectrum;
        // }

        notes.push(builtNote);

        // if (scale.repeat) {
        //   const nextHigherRepeat = scale.repeat;
        //   const nextLowerRepeat = 1 / scale.repeat;

        //   while (min && note.ratio * referenceFreq > min) {

        //   }
        // }
      }
    });
  });

  console.log(reduced);
  console.log(options);

  return notes;
}