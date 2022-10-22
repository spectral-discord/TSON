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
  const notes: Note[] = [];
  const tson = new TSON({ tunings: [ tuning ] });
  const reduced = reduce(tson).tunings?.[0];
  options = Object.assign({ globalMin: 10, globalMax: 24000 }, options);

  if (!reduced) {
    throw new Error('Error while building tuning: Tuning not found');
  }

  reduced.scales.map(scale => {
    console.log(scale);
    // const minReached = false;
    // const maxReached = false;

    // const referenceRatio = scale.notes[0];

    // TODO: if scale.reference.note exists, use that note's ratio
  });

  console.log(reduced);
  console.log(options);

  return notes;
}