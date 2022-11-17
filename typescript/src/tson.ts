'use strict';

import validate, { ValidationOptions, validationOptionsSchema } from './validate';
import standardize, { StandardizationOptions, standardizationOptionsSchema } from './standardize';
import buildTuning, { BuildTuningOptions, BuiltNote } from './build-tuning';
import reduce from './reduce';
import YAML from 'yaml';
import { assert } from 'joi';
import { toTson } from './export';

/**
 * Note interface
 *
 * @property {(string | number)} ratio alternatives: `frequency ratio` — A number or expression string representing the note's frequency relative to the scale's root
 */
type Note = {
  /**
   * An optional name for the note
   */
  name?: string
} & (
  {
    /**
     * A number or expression string representing the note's frequency relative to the scale's root
     */
    'frequency ratio'?: string | number,
    ratio?: never
  } | {
    /**
     * A number or expression string representing the note's frequency relative to the scale's root
     */
     ratio?: string | number,
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
  note?: string
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
  spectrum?: string
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
  scales: Scale[]
}

/**
 * Partial interface
 *
 * An object containing a partial's frequency ratio and amplitude weight
 */
type Partial = (
  {
    /**
     * A number or expression string representing the partial's frequency relative to the spectrum's root
     */
    'frequency ratio'?: string | number,
    ratio?: never
  } | {
    /**
     * A number or expression string representing the partial's frequency relative to the spectrum's root
     */
    ratio?: string | number,
    'frequency ratio'?: never
  }
) & (
  {
    /**
     * A number or expression string representing the amount that the partial should contribute to the spectrum's overall sound, relative to the other partials
     */
    'amplitude weight'?: string | number,
    weight?: never
  } | {
    /**
     * A number or expression string representing the amount that the partial should contribute to the spectrum's overall sound, relative to the other partials
     */
    weight?: string | number,
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
  description?: string
} & (
  {
    /**
     * An array of `Partial` objects
     */
    partials?: Partial[],
    'partial distribution'?: never
  } | {
    /**
     * An array of `Partial` objects
     */
    'partial distribution'?: Partial[],
    partials?: never

  }
);

/**
 * SetMember interface
 *
 * An object containing either a tuning, a spectrum, or both
 */
type SetMember = {
  /**
   * A spectrum's `id`
   */
  spectrum?: string,

  /**
   * If true, the provided spectrum ID will be used when building the set's tuning, rather than spectrums referenced via `scale.spectrum`
   */
  'override scale spectra'?: boolean
} & (
  {
    /**
     * A tuning system's `id`
     */
    'tuning system'?: string,
    tuning?: never
  } | {
    /**
     * A tuning system's `id`
     */
    tuning?: string,
    'tuning system'?: never
  }
)

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
   * @param {TSON | object | string | (TSON | object | string)[]} initial A TSON or array of TSONs to use for initialization. The TSONs can be another instance of this class, a javascript object, or a raw YAML string.
   * @param {ValidationOptions} validationOptions A set of validation options to use when initializing and adding TSONs.
   * @param {StandardizationOptions} standardizationOptions A set of standardization options to use when initializing and adding TSONs.
   */
  constructor(
    initial?: TSON | object | string | (TSON | object | string)[],
    validationOptions?: ValidationOptions,
    standardizationOptions?: StandardizationOptions
  ) {
    this.validationOptions = validationOptions;
    this.standardizationOptions = standardizationOptions;

    if (initial) {
      const tsonArray: (TSON | object | string)[] = [];
      tsonArray.concat(initial).forEach(tson => this.load(tson));
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

  /**
   * @returns A YAML string of the TSON data
   */
  stringify(): string {
    return toTson(this);
  }
}