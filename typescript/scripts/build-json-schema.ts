#!/usr/bin/env node
'use strict';

import parse from 'joi-to-json';
import { tsonSchema, tuningSchema, spectrumSchema, setSchema } from '../src/validate';
import { writeFileSync } from 'fs';

const tsonJSON = {
  '$id': 'https://raw.githubusercontent.com/spectral-discord/TSON/main/schema/tson.json',
  '$schema': 'http://json-schema.org/draft-07/schema#',
  title: 'TSON Schema',
  ...parse(tsonSchema, 'json')
};

const tuningJSON = {
  '$id': 'https://raw.githubusercontent.com/spectral-discord/TSON/main/schema/tuning.json',
  '$schema': 'http://json-schema.org/draft-07/schema#',
  title: 'TSON Tuning Schema',
  ...parse(tuningSchema, 'json')
};

const spectrumJSON = {
  '$id': 'https://raw.githubusercontent.com/spectral-discord/TSON/main/schema/spectrum.json',
  '$schema': 'http://json-schema.org/draft-07/schema#',
  title: 'TSON Spectrum Schema',
  ...parse(spectrumSchema, 'json')
};

const setJSON = {
  '$id': 'https://raw.githubusercontent.com/spectral-discord/TSON/main/schema/set.json',
  '$schema': 'http://json-schema.org/draft-07/schema#',
  title: 'TSON Set Schema',
  ...parse(setSchema, 'json')
};

writeFileSync(`${__dirname}/../../schema/tson.json`, JSON.stringify(tsonJSON, null, 2));
writeFileSync(`${__dirname}/../../schema/tuning.json`, JSON.stringify(tuningJSON, null, 2));
writeFileSync(`${__dirname}/../../schema/spectrum.json`, JSON.stringify(spectrumJSON, null, 2));
writeFileSync(`${__dirname}/../../schema/set.json`, JSON.stringify(setJSON, null, 2));
