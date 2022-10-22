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
  note?: string
}

export interface Scale {
  notes: (Note | string | number)[],
  reference: Reference,
  'repeat ratio'?: number,
  repeat?: number,
  'max frequency'?: string | number,
  maximum?: string | number,
  max?: string | number,
  'min frequency'?: string | number,
  minimum?: string | number,
  min?: string | number,
  spectrum?: string
}

export interface Tuning {
  id: string,
  name?: string,
  description?: string,
  scales: Scale[]
}

export interface Partial {
  'frequency ratio'?: string | number,
  ratio?: string | number,
  'amplitude weight'?: string | number,
  weight?: string | number
}

export interface Spectrum {
  id: string,
  name?: string,
  description?: string,
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
  sets?: Set[]
}

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
}