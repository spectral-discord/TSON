'use strict';

import validate, { ValidationOptions, validationOptionsSchema } from './validate';
import standardize, { StandardizationOptions, standardizationOptionsSchema } from './standardize';
import buildTuning, { BuildTuningOptions, BuiltNote } from './build-tuning';
import reduce from './reduce';
import YAML from 'yaml';
import { assert } from 'joi';
import { toTSON } from './export';

/**
 * Note interface
 *
 * @property {(string | number)} ratio alternatives: `frequency ratio` — A number or expression string representing the note's frequency relative to the scale's root
 */
export type Note = {
  /**
   * An optional name for the note
   */
  name?: string,

  [key: string]: unknown
} & (
  {
    /**
     * A number or expression string representing the note's frequency relative to the scale's root
     */
    'frequency ratio': string | number,
    ratio?: never
  } | {
    /**
     * A number or expression string representing the note's frequency relative to the scale's root
     */
     ratio: string | number,
    'frequency ratio'?: never
  }
)

/**
 * Reference interface
 *
 * An object containing a reference frequency data for use in building the tuning
 */
interface Reference {
  /**
   * The reference frequency in Hz
   */
  frequency: string | number,

  /**
   * The name  of a note from the notes array
   */
  note?: string,

  [key: string]: unknown
}

/**
 * Scale interface
 *
 * An object containing scale data
 */
export type Scale = {
  /**
   * An array of notes, which can be either `Note` objects, expression strings, or numbers
   */
  notes: (Note | string | number)[],

  /**
   * An object containing a reference frequency, and an optional note name referencing a note in the `notes` array
   */
  reference: Reference,

  /**
   * A spectrum to use for the scale
   */
  spectrum?: string,

  [key: string]: unknown
} & (
  {
    /**
     * A minimum frequency, below which none of the scale's notes should exist
     */
    'min frequency'?: string | number,
    minimum?: never,
    min?: never
  } | {
    /**
     * A minimum frequency, below which none of the scale's notes should exist
     */
    minimum?: string | number,
    'min frequency'?: never,
    min?: never }
    | { 'min frequency'?: never, minimum?: never, min?: string | number }
) & (
  {
    /**
     * A maximum frequency, above which none of the scale's notes should exist
     */
    'max frequency'?: string | number,
    maximum?: never,
    max?: never
  } | {
    /**
     * A maximum frequency, above which none of the scale's notes should exist
     */
    maximum?: string | number,
    'max frequency'?: never,
    max?:never
  } | {
    /**
     * A maximum frequency, above which none of the scale's notes should exist
     */
    max?: string | number,
    'max frequency'?: never,
    maximum?: never
  }
) & (
  {
    /**
     * A frequency ratio at which the scale's notes should repeat
     */
    'repeat ratio'?: number | string,
    repeat?: never
  } | {
    /**
     * A frequency ratio at which the scale's notes should repeat
     */
    repeat?: number | string,
    'repeat ratio'?: never
  }
);

/**
 * Tuning interface
 *
 * An object containing tuning data
 */
export interface Tuning {
  /**
   * A unique ID for the tuning
   */
  id: string,

  /**
   * A name for the tuning
   */
  name?: string,

  /**
   * A description for the tuning
   */
  description?: string,

  /**
   * An array of `Scale` objects
   */
  scales: Scale[],

  [key: string]: unknown
}

/**
 * Partial interface
 *
 * An object containing a partial's frequency ratio and amplitude weight
 */
export type Partial = {
    [key: string]: unknown
  } & (
  {
    /**
     * A number or expression string representing the partial's frequency relative to the spectrum's root
     */
    'frequency ratio': string | number,
    ratio?: never
  } | {
    /**
     * A number or expression string representing the partial's frequency relative to the spectrum's root
     */
    ratio: string | number,
    'frequency ratio'?: never
  }
) & (
  {
    /**
     * A number or expression string representing the amount that the partial should contribute to the spectrum's overall sound, relative to the other partials
     */
    'amplitude weight': string | number,
    weight?: never
  } | {
    /**
     * A number or expression string representing the amount that the partial should contribute to the spectrum's overall sound, relative to the other partials
     */
    weight: string | number,
    'amplitude weight'?: never
  }
)

/**
 * Spectrum interface
 *
 * An object containing spectrum data
 */
export type Spectrum = {
  /**
   * A unique ID for the spectrum
   */
  id: string,

  /**
   * A name for the spectrum
   */
  name?: string,

  /**
   * A description for the spectrum
   */
  description?: string,

  [key: string]: unknown
} & (
  {
    /**
     * An array of `Partial` objects
     */
    partials: Partial[],
    'partial distribution'?: never
  } | {
    /**
     * An array of `Partial` objects
     */
    'partial distribution': Partial[],
    partials?: never

  }
);

/**
 * SetMember interface
 *
 * An object containing either a tuning, a spectrum, or both
 */
export interface SetMember {
  /**
   * A spectrum's `id`
   */
  spectrum?: string,

  /**
   * If true, the provided spectrum ID will be used when building the set's tuning, rather than spectrums referenced via `scale.spectrum`
   */
  'override scale spectra'?: boolean,

  /**
     * A tuning's `id`
     */
  tuning?: string,

  [key: string]: unknown
}

/**
 * Set interface
 *
 * An object used to store a set of tunings and spectra
 */
export interface Set {
  /**
   * A unique ID for the set
   */
  id: string,

  /**
   * A name for the set
   */
  name?: string,

  /**
   * A description for the set
   */
  description?: string,

  /**
   * An array of `SetMember` objects
   */
  members: SetMember[],

  [key: string]: unknown
}

export interface TSON {
  tunings?: Tuning[],
  spectra?: Spectrum[],
  sets?: Set[]
}

interface Description {
  name?: string,
  id: string,
  description?: string
}

interface TSONOptions {
  validationOptions?: ValidationOptions,
  standardizationOptions?: StandardizationOptions,
  reduce?: boolean
}

interface LoadOptions {
  reduce?: boolean,
  standardize?: boolean
}

/**
 * TSON class
 *
 * This class can be used to aggregate, validate, standardize,
 * and reduce TSON data, as well as build tunings.
 */
export class TSON implements TSON {
  private validationOptions?: ValidationOptions;
  private standardizationOptions?: StandardizationOptions;

  /**
   * TSON constructor
   * @param {TSON | object | string | (TSON | object | string)[]} initial A TSON, or array of TSONs, to use for initialization. The TSONs can be another instance of this class, a javascript object, or a raw YAML string.
   * @param {TSONOptions} options
   * @param {ValidationOptions} options.validationOptions A set of validation options to use when initializing and adding TSONs.
   * @param {StandardizationOptions} options.standardizationOptions A set of standardization options to use when initializing and adding TSONs.
   * @param {boolean} options.reduce If true, reduce() will be called for any TSON data being used to initialize the object
   */
  constructor(
    initial?: TSON | object | string | (TSON | object | string)[],
    options?: TSONOptions
  ) {
    if (options?.validationOptions) {
      assert(options.validationOptions, validationOptionsSchema, 'Invalid validation options!\n');
      this.validationOptions = options.validationOptions;
    }

    if (options?.standardizationOptions) {
      assert(options.standardizationOptions, standardizationOptionsSchema, 'Invalid standardization options!\n');
      this.standardizationOptions = options.standardizationOptions;
    }

    if (initial) {
      const tsonArray: (TSON | object | string)[] = [];
      tsonArray.concat(initial).forEach(tson => this.load(tson, { reduce: options?.reduce }));
    }
  }

  /**
   * Validates and standardizes a TSON, and adds it to the class instance
   * @param {TSON | object | string} input A TSON to use for initialization. It can be another instance of this class, a javascript object, or a raw YAML string.
   */
  load (input: TSON | object | string, options?: LoadOptions): void {
    let tson: TSON = typeof input === 'string' ? YAML.parse(input) : input;
    validate(tson, this.validationOptions);

    if (options?.reduce) {
      tson = new TSON(reduce(tson));
    } else if (
      options?.standardize
      || (
        this.standardizationOptions
        && !(typeof options?.standardize === 'boolean' && !options.standardize)
      )
    ) {
      tson = standardize(tson, this.standardizationOptions);
    }

    if (tson?.tunings) {
      this.tunings = tson.tunings.concat(this.tunings || []);
    }

    if (tson?.spectra) {
      this.spectra = tson.spectra.concat(this.spectra || []);
    }

    if (tson?.sets) {
      this.sets = tson.sets.concat(this.sets || []);
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

    this.tunings = reformatted?.tunings;
    this.spectra = reformatted?.spectra;
    this.sets = reformatted?.sets;
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
    return this.tunings?.find(tuning => tuning.id === id);
  }

  /**
   * Finds a spectrum by its `id`
   * @param {string} id The tuning ID to search for.
   * @returns {Spectrum | undefined } Returns a `Spectrum` object if a matching spectrum was found, otherwise undefined.
   */
  findSpectrumById(id: string): Spectrum | undefined {
    return this.spectra?.find(spectrum => spectrum.id === id);
  }

  /**
   * Finds a set by its `id`
   * @param {string} id The tuning ID to search for.
   * @returns {Set | undefined } A `Set` object if a matching set was found, otherwise undefined.
   */
  findSetById(id: string): Set | undefined {
    return this.sets?.find(set => set.id === id);
  }

  /**
   * Lists the IDs, names, and descriptions of all tunings in the class instance.
   * @returns {object[]} An array of objects containing tuning `id`, `name`, and `description` values.
   */
  describeTunings(): Description[] {
    return this.tunings?.map(tuning => ({
      id: tuning.id,
      ...(tuning.name && { name: tuning.name }),
      ...(tuning.description && { description: tuning.description })
    })) || [];
  }

  /**
   * Lists the IDs, names, and descriptions of all spectra in the class instance.
   * @returns {object[]} An array of objects containing spectrum `id`, `name`, and `description` values.
   */
  describeSpectra(): Description[] {
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
  describeSets(): Description[] {
    return this.sets?.map(set => ({
      id: set.id,
      ...(set.name && { name: set.name }),
      ...(set.description && { description: set.description })
    })) || [];
  }

  /**
   * Reduces all TSON data  and modifies the existing object
   *
   * This will validate and standardize the TSON data,
   * evaluate expressions, normalize partial amplitude
   * weights, and remove 'Hz' from frequencies.
   */
  reduce() {
    const reduced = reduce(this);

    if (reduced?.tunings) {
      this.tunings = reduced.tunings;
    }

    if (reduced?.spectra) {
      this.spectra = reduced.spectra;
    }

    if (reduced?.sets) {
      this.sets = reduced.sets;
    }
  }

  /**
   * Reduces all TSON data and returns a new TSON
   * object with the reduced values without modifying
   * the existing TSON object
   *
   * This will validate and standardize the TSON data,
   * evaluate expressions, normalize partial amplitude
   * weights, and remove 'Hz' from frequencies.
   *
   * @returns {ReducedTSON} A TSON object with reduced values
   */
  getReduced() {
    return reduce(this);
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

  /**
   * @returns A YAML string of the TSON data
   */
  stringify(): string {
    return toTSON(this);
  }
}