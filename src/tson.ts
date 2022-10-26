'use strict';

import validate, { ValidationOptions, validationOptionsSchema } from './validate';
import standardize, { StandardizationOptions, standardizationOptionsSchema } from './standardize';
import buildTuning, { BuildTuningOptions, BuiltNote } from './build-tuning';
import reduce from './reduce';
import YAML from 'yaml';
import { assert } from 'joi';

type Note = {
  name?: string
} & (
  { 'frequency ratio'?: string | number, ratio?: never }
    | { 'frequency ratio'?: never, ratio?: string | number }
)

interface Reference {
  frequency: string | number,
  note?: string
}

export type Scale = {
  notes: (Note | string | number)[],
  reference: Reference,
  spectrum?: string
} & (
  { 'min frequency'?: string | number, minimum?: never, min?: never }
    | { 'min frequency'?: never, minimum?: string | number, min?: never }
    | { 'min frequency'?: never, minimum?: never, min?: string | number }
) & (
  { 'max frequency'?: string | number, maximum?: never , max?: never }
    | { 'max frequency'?: never, maximum?: string | number , max?: never }
    | { 'max frequency'?: never, maximum?: never , max?: string | number }
) & (
  { 'repeat ratio'?: number, repeat?: never }
    | { 'repeat ratio'?: never, repeat?: number }
);

export interface Tuning {
  id: string,
  name?: string,
  description?: string,
  scales: Scale[]
}

type Partial = (
  { 'frequency ratio'?: string | number, ratio?: never }
    | { 'frequency ratio'?: never, ratio?: string | number }
) & (
  { 'amplitude weight'?: string | number, weight?: never }
    | { 'amplitude weight'?: never, weight?: string | number }
)

export type Spectrum = {
  id: string,
  name?: string,
  description?: string
} & (
  { partials?: Partial[], 'partial distribution'?: never }
    | { partials?: never, 'partial distribution'?: Partial[] }
);

type SetMember = {
  spectrum?: string,
  'override scale spectra'?: boolean
} & (
  { 'tuning system'?: string, tuning?: never }
    | { 'tuning system'?: never, tuning?: string }
)

export interface Set {
  id: string,
  name?: string,
  description?: string,
  members: SetMember[]
}

/**
 *  TSON Type Interface
 */
export interface TSON {
  tunings?: Tuning[],
  'tuning systems'?: Tuning[],
  spectra?: Spectrum[],
  sets?: Set[]
}

// TODO: Add actual documentation everywhere
/**
 * TSON class
 */
export class TSON implements TSON {
  private validationOptions?: ValidationOptions;
  private standardizationOptions?: StandardizationOptions;

  constructor(
    tson?: string | TSON | object,
    validationOptions?: ValidationOptions,
    standardizationOptions?: StandardizationOptions
  ) {

    this.validationOptions = validationOptions;
    this.standardizationOptions = standardizationOptions;

    if (tson) {
      this.load(tson);
    }
  }

  load (input: string | TSON | object): void {
    const tson: TSON = typeof(input) === 'string' ? YAML.parse(input) : input;

    validate(tson, this.validationOptions);

    const formatted = standardize(tson, this.standardizationOptions);

    if (formatted.tunings) {
      this.tunings = formatted.tunings.concat(this.tunings || []);
    }

    if (formatted['tuning systems']) {
      this['tuning systems'] = formatted['tuning systems'].concat(this['tuning systems'] || []);
    }

    if (formatted.spectra) {
      this.spectra = formatted.spectra.concat(this.spectra || []);
    }

    if (formatted.sets) {
      this.sets = formatted.sets.concat(this.sets || []);
    }
  }

  setStandardizationOptions(standardizationOptions: StandardizationOptions): void {
    assert(standardizationOptions, standardizationOptionsSchema, 'Invalid standardization options!\n');
    this.standardizationOptions = standardizationOptions;

    const reformatted = standardize(this, this.standardizationOptions);

    this.tunings = reformatted.tunings;
    this['tuning systems'] = reformatted['tuning systems'];
    this.spectra = reformatted.spectra;
    this.sets = reformatted.sets;
  }

  setValidationOptions(validationOptions: ValidationOptions): void {
    assert(validationOptions, validationOptionsSchema, 'Invalid validation options!\n');
    this.validationOptions = validationOptions;
    validate(this, this.validationOptions);
  }

  findTuningById(id: string): Tuning | undefined {
    if (this.tunings) {
      return this.tunings.find(tuning => tuning.id === id);
    }

    if (this['tuning systems']) {
      return this['tuning systems'].find(tuning => tuning.id === id);
    }

    return undefined;
  }

  findSpectrumById(id: string): Spectrum | undefined {
    if (this.spectra) {
      return this.spectra.find(spectrum => spectrum.id === id);
    }

    return undefined;
  }

  findSetById(id: string): Set | undefined {
    if (this.sets) {
      return this.sets.find(set => set.id === id);
    }

    return undefined;
  }

  listTuningNames(): string[] {
    return (this.tunings || this['tuning systems'])?.reduce<string[]>((acc, cur) => cur.name && !acc.includes(cur.name) ? acc.concat(cur.name) : acc, []) || [];
  }

  listTuningIds(): string[] {
    return (this.tunings || this['tuning systems'])?.map(tuning => tuning.id) || [];
  }

  listSpectrumNames(): string[] {
    return this.spectra?.reduce<string[]>((acc, cur) => cur.name && !acc.includes(cur.name) ? acc.concat(cur.name) : acc, []) || [];
  }

  listSpectrumIds(): string[] {
    return this.spectra?.map(tuning => tuning.id) || [];
  }

  listSetNames(): string[] {
    return this.sets?.reduce<string[]>((acc, cur) => cur.name && !acc.includes(cur.name) ? acc.concat(cur.name) : acc, []) || [];
  }

  listSetIds(): string[] {
    return this.sets?.map(set => set.id) || [];
  }

  reduce() {
    const reduced = reduce(this, this.standardizationOptions);

    if (reduced.tunings) {
      this.tunings = reduced.tunings;
    }

    if (reduced['tuning systems']) {
      this['tuning systems'] = reduced['tuning systems'];
    }

    if (reduced.spectra) {
      this.spectra = reduced.spectra;
    }

    if (reduced.sets) {
      this.sets = reduced.sets;
    }
  }

  buildTuning(
    tuningId: string,
    buildTuningOptions?: BuildTuningOptions
  ): BuiltNote[] {
    const tuning = this.findTuningById(tuningId);

    if (!tuning) {
      throw new Error('A tuning with the provided `tuningId` was not found.');
    }

    const spectra: Spectrum[] = [];
    const spectrumIds = tuning.scales.map(scale => scale.spectrum);

    if (buildTuningOptions?.defaultSpectrumId) {
      spectrumIds.push(buildTuningOptions?.defaultSpectrumId);
    }

    spectrumIds.forEach(id => {
      if (id) {
        const spectrum = this.findSpectrumById(id);

        if (!spectrum) {
          throw new Error(`
            A spectrum with an ID referenced by a scale could not be found.
            Referenced ID: ${id}
          `);
        }

        spectra.push(spectrum);
      }
    });

    return buildTuning(tuning, spectra.length > 0 ? spectra : undefined, buildTuningOptions);
  }
}