#!/usr/bin/env node
'use strict';

import parse from 'joi-to-json';
import { tsonSchema } from '../src/validate';
import { writeFileSync } from 'fs';

const json = {
  '$id': 'https://raw.githubusercontent.com/spectral-discord/TSON/main/schema/tson.json',
  '$schema': 'http://json-schema.org/draft-07/schema#',
  title: 'TSON Schema',
  ...parse(tsonSchema, 'json')
}

writeFileSync(`${__dirname}/../schema/tson.json`, JSON.stringify(json, null, 2));