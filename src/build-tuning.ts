import { TSON, Tuning, Note } from './tson';
import reduce from './reduce';

interface BuildTuningOptions {
  globalMin: number,
  globalMax: number
}

export default function buildTuning(
  tuning: Tuning,
  options: BuildTuningOptions = {
    globalMin: 10,
    globalMax: 24000
  }
): Note[] {
  const tson = new TSON({ tunings: [ tuning ] });
  const reduced = reduce(tson).tunings?.[0];
  const notes: Note[] = [];

  console.log(reduced);
  console.log(options);

  return notes;
}