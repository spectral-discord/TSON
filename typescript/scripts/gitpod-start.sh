#!/bin/bash

if [ ! -f "package.json" ]; then
  ./scripts/init-project.sh
fi

if [ ! -z "${NPM_TOKEN}" ] && [ ! -f ".npmrc" ]; then
  printf "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" >> .npmrc
fi