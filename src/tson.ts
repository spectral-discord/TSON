'use strict';

import validate, { ValidationOptions, validationOptionsSchema } from './validate';
import standardize, { StandardizationOptions, standardizationOptionsSchema } from './standardize';
import buildTuning, { BuildTuningOptions, BuiltNote } from './build-tuning';
import reduce from './reduce';
import YAML from 'yaml';
import { assert } from 'joi';

/**
 * Note type
 *
 * @param {(string | number)} ratio alternatives: `frequency ratio` — A number or expression string representing the note's frequency relative to the scale's root
 * @param {string} [name] An optional name for the note
 */
type Note = {
  name?: string
} & (
  { 'frequency ratio'?: string | number, ratio?: never }
    | { 'frequency ratio'?: never, ratio?: string | number }
)

/**
 * Reference type
 *
 * @param {(string | number)} frequency A frequency to be used as a reference for the scale when building its parent tuning.
 * @param {string} [note] The name of a note in the scale's `notes` array. If a name is not provided, the reference frequency will refer to the root ratio of `1`.
 */
interface Reference {
  frequency: string | number,
  note?: string
}

/**
 * Scale type
 *
 * @param {(Note | string | number)[]} notes An array of notes, which can be either `Note` objects, expression strings, or numbers
 * @param {Reference} reference An object containing a reference frequency, and an optional note name referencing a note in the `notes` array
 * @param {string} [spectrum] A spectrum to use for the scale
 * @param {string} [repeat] alternatives: `repeat` — A spectrum to use for the scale
 * @param {(string | number)} [min] alternatives: `minimum`, `min frequency` — A minimum frequency, below which none of the scale's notes should exist.
 * @param {(string | number)} [max] alternatives: `maximum`, `max frequency` — A maximum frequency, above which none of the scale's notes should exist.
 */
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

/**
 * Tuning type
 *
 * @param {string} id A unique ID for the tuning
 * @param {string} [name] A name for the tuning
 * @param {string} [description] A description for the tuning
 * @param {Scale[]} scales An array of `Scale` objects
 */
export interface Tuning {
  id: string,
  name?: string,
  description?: string,
  scales: Scale[]
}

/**
 * Partial type
 *
 * @param {string | number} ratio alternatives: `frequency ratio` — A number or expression string representing the partial's frequency relative to the spectrum's root
 * @param {string | number} weight alternatives: `amplitude weight` — A number or expression string representing the amount that the partial should contribute to the spectrum's overall sound, relative to the other partials
 */
type Partial = (
  { 'frequency ratio'?: string | number, ratio?: never }
    | { 'frequency ratio'?: never, ratio?: string | number }
) & (
  { 'amplitude weight'?: string | number, weight?: never }
    | { 'amplitude weight'?: never, weight?: string | number }
)

/**
 * Spectrum type
 *
 * @param {string} id A unique ID for the spectrum
 * @param {string} [name] A name for the spectrum
 * @param {string} [description] A description for the spectrum
 * @param {Partial[]} partials alternatives: `partial distribution` — An array of `Partial` objects
 */
export type Spectrum = {
  id: string,
  name?: string,
  description?: string
} & (
  { partials?: Partial[], 'partial distribution'?: never }
    | { partials?: never, 'partial distribution'?: Partial[] }
);

/**
 * SetMember type
 *
 * @param {string} [spectrum] A spectrum's `id`
 * @param {string} [tuning] alternatives: `tuning system` — A tuning system's `id`
 * @param {boolean} [overrideScaleSpectra] If true, the provided spectrum ID will be used when building the set's tuning, rather than spectrums referenced via `scale.spectrum`
 */
type SetMember = {
  spectrum?: string,
  'override scale spectra'?: boolean
} & (
  { 'tuning system'?: string, tuning?: never }
    | { 'tuning system'?: never, tuning?: string }
)

/**
 * Spectrum type
 *
 * @param {string} id A unique ID for the set
 * @param {string} [name] A name for the set
 * @param {string} [description] A description for the set
 * @param {SetMember[]} members An array of `SetMember` objects
 */
export interface Set {
  id: string,
  name?: string,
  description?: string,
  members: SetMember[]
}

export interface TSON {
  tunings?: Tuning[],
  'tuning systems'?: Tuning[],
  spectra?: Spectrum[],
  sets?: Set[]
}

type NameAndId = {
  name?: string,
  id: string
}

// TODO: Add actual documentation everywhere
/**
 * TSON class
 *
 * This class can be used to aggregate, validate, standardize,
 * and reduce TSONs, as well as for building tunings.
 */
export class TSON implements TSON {
  private validationOptions?: ValidationOptions;
  private standardizationOptions?: StandardizationOptions;

  /**
   * TSON constructor
   * @param {TSON | object | string} tson A TSON to use for initialization. It can be another instance of this class, a javascript object, or a raw YAML string.
   * @param {ValidationOptions} validationOptions A set of validation options to use when initializing and adding TSONs.
   * @param {StandardizationOptions} standardizationOptions A set of standardization options to use when initializing and adding TSONs.
   */
  constructor(
    tson?: TSON | object | string,
    validationOptions?: ValidationOptions,
    standardizationOptions?: StandardizationOptions
  ) {
    this.validationOptions = validationOptions;
    this.standardizationOptions = standardizationOptions;

    if (tson) {
      this.load(tson);
    }
  }

  /**
   * Validates and standardizes a TSON, and adds it to the class instance
   * @param {TSON | object | string} input A TSON to use for initialization. It can be another instance of this class, a javascript object, or a raw YAML string.
   */
  load (input: TSON | object | string): void {
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

  /**
   * Sets the standardization options for all TSONs added to the class instance
   * @param {StandardizationOptions} standardizationOptions A set of standardization options to use when initializing and adding TSONs.
   */
  setStandardizationOptions(standardizationOptions: StandardizationOptions): void {
    assert(standardizationOptions, standardizationOptionsSchema, 'Invalid standardization options!\n');
    this.standardizationOptions = standardizationOptions;

    const reformatted = standardize(this, this.standardizationOptions);

    this.tunings = reformatted.tunings;
    this['tuning systems'] = reformatted['tuning systems'];
    this.spectra = reformatted.spectra;
    this.sets = reformatted.sets;
  }

  /**
   * Sets the validation options for all TSONs added to the class instance
   * @param {ValidationOptions} validationOptions A set of validation options to use when initializing and adding TSONs.
   */
  setValidationOptions(validationOptions: ValidationOptions): void {
    assert(validationOptions, validationOptionsSchema, 'Invalid validation options!\n');
    this.validationOptions = validationOptions;
    validate(this, this.validationOptions);
  }

  /**
   * Finds a tuning by its `id`
   * @param {string} id The tuning ID to search for.
   * @returns {Tuning | undefined } Returns a `Tuning` object if a matching tuning was found, otherwise undefined.
   */
  findTuningById(id: string): Tuning | undefined {
    if (this.tunings) {
      return this.tunings.find(tuning => tuning.id === id);
    }

    if (this['tuning systems']) {
      return this['tuning systems'].find(tuning => tuning.id === id);
    }

    return undefined;
  }

  /**
   * Finds a spectrum by its `id`
   * @param {string} id The tuning ID to search for.
   * @returns {Spectrum | undefined } Returns a `Spectrum` object if a matching spectrum was found, otherwise undefined.
   */
  findSpectrumById(id: string): Spectrum | undefined {
    if (this.spectra) {
      return this.spectra.find(spectrum => spectrum.id === id);
    }

    return undefined;
  }

  /**
   * Finds a set by its `id`
   * @param {string} id The tuning ID to search for.
   * @returns {Set | undefined } A `Set` object if a matching set was found, otherwise undefined.
   */
  findSetById(id: string): Set | undefined {
    if (this.sets) {
      return this.sets.find(set => set.id === id);
    }

    return undefined;
  }

  /**
   * Lists the IDs, names, and descriptions of all tunings in the class instance.
   * @returns {object[]} An array of objects containing tuning `id`, `name`, and `description` values.
   */
  describeTunings(): NameAndId[] {
    return (this.tunings || this['tuning systems'])?.map(tuning => ({
      id: tuning.id,
      ...(tuning.name && { name: tuning.name }),
      ...(tuning.description && { description: tuning.description })
    })) || [];
  }

  /**
   * Lists the IDs, names, and descriptions of all spectra in the class instance.
   * @returns {object[]} An array of objects containing spectrum `id`, `name`, and `description` values.
   */
  listSpectra(): NameAndId[] {
    return this.spectra?.map(spectrum => ({
      id: spectrum.id,
      ...(spectrum.name && { name: spectrum.name }),
      ...(spectrum.description && { description: spectrum.description })
    })) || [];
  }

  /**
   * Lists the IDs, names, and descriptions of all sets in the class instance.
   * @returns {object[]} An array of objects containing set `id`, `name`, and `description` values.
   */
  listSets(): NameAndId[] {
    return this.sets?.map(set => ({
      id: set.id,
      ...(set.name && { name: set.name }),
      ...(set.description && { description: set.description })
    })) || [];
  }

  /**
   * Reduces all TSON data in the class instance
   *
   * This will validate and standardize the TSON data,
   * evaluate expressions, normalize partial amplitude
   * weights, and remove 'Hz' from frequencies.
   */
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

  /**
   * Builds a tuning from the class instance's
   * stored tuning and spectrum data.
   *
   * @param {string} tuningId The `id` of the tuning to build
   * @param {BuildTuningOptions} buildTuningOptions A set of options to be used when building the tuning
   * @returns {BuiltNote[]} An array of `BuiltNote` objects
   */
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