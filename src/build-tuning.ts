import { TSON, Tuning, Spectrum } from './tson';
import reduce, { ReducedSpectrum } from './reduce';
import { round } from 'mathjs';

interface BuildTuningOptions {
  globalMin?: number,
  globalMax?: number,
  forcedSpectrum?: ReducedSpectrum,
  includeSpectra?: boolean,
  allowConflicts?: boolean,
  precision?: number
}

interface Note {
  frequency: number,
  name?: string,
  spectrum?: ReducedSpectrum
}

export default function buildTuning(
  tuning: Tuning,
  spectra?: Spectrum[],
  options?: BuildTuningOptions
): Note[] {
  options = Object.assign({
    globalMin: 10,
    globalMax: 24000,
    allowConflicts: false,
    includeSpectra: true,
    precision: 7
  }, options);

  const notes: Note[] = [];
  const tson = new TSON({
    tunings: [ tuning ],
    ...(spectra && { spectra })
  });
  const reduced = reduce(tson).tunings?.[0];

  if (!reduced) {
    throw new Error('Error while building tuning: Tuning not found');
  }

  reduced.scales.forEach(scale => {
    // Determine whether to use the scale or global min/max settings
    const min = scale.min && options?.globalMin && scale.min > options?.globalMin
      ? scale.min
      : options?.globalMin;
    const max = scale.max && options?.globalMax && scale.max < options?.globalMax
      ? scale.max
      : options?.globalMax;

    // Set the reference frequency, calculating the root's frequency for convenience
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
        const freq = note.ratio * referenceFreq;
        const builtNote: Note = {
          frequency: round(freq, options?.precision),
          ...(note.name && { name: note.name }),
        };

        if (options?.forcedSpectrum || scale.spectrum) {
          builtNote.spectrum = options?.forcedSpectrum || scale.spectrum;
        }

        if (
          options?.allowConflicts
          || !notes.find(note => note.frequency === builtNote.frequency)
        ) {
          notes.push(builtNote);
        } else if (!options?.allowConflicts) {
          const problemNotes = [
            {
              name: builtNote.name,
              frequency: builtNote.frequency
            },
            {
              name: notes.find(note => note.frequency === builtNote.frequency)?.name,
              frequency: builtNote.frequency
            }
          ];

          throw new Error(`
            Conflicting note frequencies were found.
            To allow multiple notes with the same frequency, set 'allowConflicts' to true.
            Problem notes:
            ${JSON.stringify(problemNotes)}
          `);
        }

        if (scale.repeat) {
          // Add notes for scale iterations descending in frequency
          let lastFreq = freq;
          while (min && lastFreq / scale.repeat > min) {
            lastFreq /= scale.repeat;

            if (
              options?.allowConflicts
              || !notes.find(note => note.frequency === lastFreq)
            ) {
              notes.push({
                ...builtNote,
                frequency: round(lastFreq, options?.precision)
              });
            } else if (!options?.allowConflicts) {
              const problemNotes = [
                {
                  name: builtNote.name,
                  frequency: lastFreq
                },
                {
                  name: notes.find(note => note.frequency === lastFreq)?.name,
                  frequency: lastFreq
                }
              ];

              throw new Error(`
                Conflicting note frequencies were found.
                To allow multiple notes with the same frequency, set 'allowConflicts' to true.
                Problem notes:
                ${JSON.stringify(problemNotes)}
              `);
            }
          }

          // Add notes for scale iterations ascending in frequency
          lastFreq = freq;
          while (max && lastFreq * scale.repeat < max) {
            lastFreq *= scale.repeat;

            if (
              options?.allowConflicts
              || !notes.find(note => note.frequency === lastFreq)
            ) {
              notes.push({
                ...builtNote,
                frequency: round(lastFreq, options?.precision)
              });
            } else if (!options?.allowConflicts) {
              const problemNotes = [
                {
                  name: builtNote.name,
                  frequency: lastFreq
                },
                {
                  name: notes.find(note => note.frequency === lastFreq)?.name,
                  frequency: lastFreq
                }
              ];

              throw new Error(`
                Conflicting note frequencies were found.
                To allow multiple notes with the same frequency, set 'allowConflicts' to true.
                Problem notes:
                ${JSON.stringify(problemNotes)}
              `);
            }
          }
        }
      }
    });
  });

  return notes.sort((a, b) => a.frequency - b.frequency);
}