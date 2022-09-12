#!/bin/bash

yarn init

yarn add -D \
  typescript \
  jest \
  ts-jest \
  @types/jest \
  eslint \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser \
  husky \
  rollup \
  rollup-plugin-dts \
  json \
  npm-add-script

npx husky install

npx npm-add-script -k build -v "tsc && yarn rollup -c"
npx npm-add-script -k lint -v "eslint src --fix"
npx npm-add-script -k test -v "jest --config jest.config.ts"
npx npm-add-script -k preversion -v "yarn test && yarn lint"
npx npm-add-script -k prepublishOnly -v "yarn test && yarn lint"
npx npm-add-script -k prepare -v "husky install"

yarn json -I -f package.json -e "this.main=\"dist/bundle.cjs.js\""
yarn json -I -f package.json -e "this.module=\"dist/bundle.es.js\""
yarn json -I -f package.json -e "this.types=\"dist/bundle.d.ts\""