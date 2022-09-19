'use strict';

import validate, { ValidationOptions } from './validate';
import YAML from 'yaml';

export interface Note {
  'frequency ratio'?: string | number,
  ratio?: string | number,
  name?: string
}

interface Reference {
  frequency: string | number,
  name: string
}

export interface Scale {
  notes: Note[] | string[] | number[],
  reference: Reference | string | number,
  'repeat ratio': number,
  repeat: number,
  'max frequency': string | number,
  max: string | number,
  'min frequency': string | number,
  min: string | number,
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
  frequency?: string | number,
  'amplitude weight': string | number,
  amplitude: string | number,
  weight: string | number
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
  validate?: (tson: TSON, options?: ValidationOptions) => boolean
  // standardize?: (tson: TSON, options?: StandardizationOptions) => boolean;
}

export class TSON implements TSON {
  tunings?: Tuning[];
  'tuning systems'?: Tuning[];
  spectra?: Spectrum[];
  sets?: Set[];
  validate?: (tson: TSON, options?: ValidationOptions) => boolean = validate;
  // standardize?: (tson: TSON, options?: StandardizationOptions) => boolean = standardize;

  constructor(
    tson: string,
    validationOptions?: ValidationOptions
    // standardizationOptions?: StandardizationOptions
  ) {
    // Parse YAML to TSON object
    const parsed = YAML.parse(tson);

    // Validate TSON object
    validate(parsed, validationOptions);

    // Standardize

    // Add buildTuning() to all Tuning objects
    // Add buildSpectrum() to all Spectrum objects
  }
}