# TSON
This repository contains the standardization for **TSON** (Tuning-Spectrum Object Notation) - a JSON/[Hjson](https://hjson.github.io/)-based file format for storing musical tuning and timbre/spectrum data

### Why another microtonal file standard?
[Valid question.](https://xkcd.com/927/)

<details>
<summary>Existing formats kinda suck, and we actually do need something better...</summary>
<br>

- They suck to work with... some sacrifice portability and manipulability for readability (SCL, TUN), while others are environment-specific or unreadable (MTS)
- They all have silly limitations that reflect how aged they are - no support for reference frequecies, pseudo-octaves, or more than 12 notes per octave; limits on how "detuned" a note can be; etc.
- No standardizations or commonly used data structures exist for timbre/spectrum data or for pairing tunings and timbres
- Readable formats only allow notes defined in cents and just intonation ratios, reinforcing the dominance of 12-edo, harmonic timbres, and Western conceptions of "consonance" in music theory, research, audio tech, and musical communication. A sad state of affairs for microtonal music.
</details>

<details>
<summary>TSON aims to address these shortcomings in a number of ways...</summary>
<br>

- Readable without sacrificing portability and manipulability (JSON is pretty much everywhere these days, and the [Hjson](https://hjson.github.io/) superset is quite nice)
- Compatible with existing tuning formats, yet extensible
- While cents are an option, pitch ratios are, by default, defined via floats or expressions. Expressions can use the following operators:
  - Arithmetic: `+, -, *, /`
  - Exponentiation: `**`
  - Parentheses: `()`
  - **Planned**: Variables (for use with TSONify)
- Unrecognized parameters won't break TSON interpretation, they'll just be ignored if not implemented
- Able to contain timbre/spectrum data, multiple tunings and timbres per file, plus tuning-timbre groupings and sequences
- **Planned**: Instrument data (e.g. key layouts) and note/timbre mappings
</details>

<details>
<summary>Also, TSON is intended to be a focal point for an array of new microtonal software...</summary>
<br>

- **Coming Soon!**: [TSONify]() - open-source packages/libraries for multiple languages with useful features for manipulating TSON data (and hopefully aiding its adoption)
  - Conversion between TSON and existing microtonal formats
  - Validating TSON data
  - Support for the use of variables in expressions that enable dynamic tunings, timbres, and instrument models
  - Multi-file aggregation for groupings and sequences
  - Integration with TonalHub for fetching and updating data hosted in TonalHub instances, enabling networked groupings and sequences
  - And much more...
- **Coming Soon!**: [TonalHub]() - open-source, self-hostable application for archiving and working with tuning, timbre, and instrument models
  - REST API for archiving, fetching, and manipulating TSON data
  - Model versioning, so networked groupings and sequences can be maintained while allowing models to be updated
  - Web UI with tools for finding, analyzing, and developing models
  - And much more...
</details>
</details>

## Specification
Coming Soon

## Include TSON Support in Your Own Software
Coming Soon

## Get Involved
Coming Soon
