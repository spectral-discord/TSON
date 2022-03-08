# TSON
This repository contains the standardization for **TSON** (Tuning-Spectrum Object Notation) - a YAML-based file format for storing musical tuning and timbre/spectrum data

### Why another microtonal file standard?
[Valid question.](https://xkcd.com/927/)

<details>
<summary>Existing formats aren't equipped for modern xenharmonic/microtonal frameworks and software practices...</summary>
<br>

- Some sacrifice portability and manipulability for readability (SCL, TUN), while others are environment-specific or unreadable (MTS)
- Each comes with limitations such as failing to support reference frequencies, pseudo-octaves/repetition ratios, or more than 12 notes per octave; limits on how "detuned" a note can be; etc. - nor are they readily extensible
- No standardizations or commonly used data structures exist for timbre/spectrum data or for pairing tunings and timbres
- Most only allow notes to be defined in cents or just intonation ratios - reinforcing the dominance of 12-edo and harmonic timbres in music theory, research, audio tech, and musical communication
</details>

<details>
<summary>TSON aims to address their shortcomings in a number of ways...</summary>
<br>

- Readable without sacrificing portability and manipulability - YAML is readable and backwards-compatible with JSON... which is supported pretty much everywhere now
- Compatible with existing tuning formats, yet extensible
- Pitch ratios are defined via floats or expressions... preserving support for JI notation and, albeit via `2^(cents / 1200)`, cents
- Unrecognized parameters won't break TSON interpretation, they'll just be ignored if not implemented
- Able to contain timbre/spectrum data, multiple tunings and timbres per file, plus tuning-timbre groupings and sequences
- **Planned**: Instrument data (e.g. key layouts) and further timbre data structures (dynamic/reactive timbres, waveforms, and more)
</details>

<details>
<summary>Also, TSON is intended to be a focal point for an set of useful microtonal software...</summary>
<br>

- **Coming Soon!**: [TSONify]() - open-source packages/libraries for multiple languages with useful features for manipulating TSON data (and hopefully aiding its adoption)
  - Conversion between TSON and existing microtonal formats
  - TSON data validation
  - Support for the use of variables in expressions for dynamic tunings, timbres, and instrument models
  - Multi-file aggregation and linking for timbre/tuning pairings and sequences
  - Integration with TonalHub for fetching and updating data hosted in TonalHub instances
  - And much more...
- **Coming Soon!**: [TonalHub]() - open-source, self-hostable application for archiving and working with tuning, timbre, and instrument models
  - API and UI for archiving, fetching, and manipulating TSON data
  - TSON data model versioning
  - API and UI toolkits for analyzing and developing tunings and timbres
  - And much more...
</details>

## Specification
Coming Soon

## Include TSON Support in Your Own Software
Coming Soon

## Get Involved
Coming Soon
