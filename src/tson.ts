'use strict';

import validate, { ValidationOptions } from './validate';
import standardize, { StandardizationOptions } from './standardize';
import YAML from 'yaml';

export interface Note {
  'frequency ratio'?: string | number,
  ratio?: string | number,
  name?: string
}

interface Reference {
  frequency: string | number,
  note: string
}

export interface Scale {
  notes: (Note | string | number)[],
  reference: Reference | string | number,
  'repeat ratio'?: number,
  repeat?: number,
  'max frequency'?: string | number,
  max?: string | number,
  'min frequency'?: string | number,
  min?: string | number,
  spectrum: string
}

export interface Tuning {
  name?: string,
  description?: string,
  id?: string,
  scales: Scale[]
}

export interface Partial {
  'frequency ratio'?: string | number,
  ratio?: string | number,
  'amplitude weight'?: string | number,
  weight?: string | number
}

export interface Spectrum {
  name?: string,
  description?: string,
  id?: string,
  partials?: Partial[],
  'partial distribution'?: Partial[]
}

interface SetMember {
  'tuning system': string,
  tuning: string,
  spectrum: string,
  'override scale spectra': boolean
}

export interface Set {
  name: string,
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
  sets?: Set[],
}

/**
 * TSON class
 */
export class TSON implements TSON {
  tunings?: Tuning[];
  'tuning systems'?: Tuning[];
  spectra?: Spectrum[];
  sets?: Set[];
  private validationOptions?: ValidationOptions;
  private standardizationOptions?: StandardizationOptions;

  constructor(
    tson?: string | TSON,
    validationOptions?: ValidationOptions,
    standardizationOptions?: StandardizationOptions
  ) {

    this.validationOptions = validationOptions;
    this.standardizationOptions = standardizationOptions;

    if (tson) {
      this.load(tson);
    }
  }

  load(input: string | TSON): void {
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
    this.standardizationOptions = standardizationOptions;

    const reformatted = standardize(this, this.standardizationOptions);

    this.tunings = reformatted.tunings;
    this['tuning systems'] = reformatted['tuning systems'];
    this.spectra = reformatted.spectra;
    this.sets = reformatted.sets;
  }

  setValidationOptions(validationOptions: ValidationOptions): void {
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
}