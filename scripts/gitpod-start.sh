#!/bin/bash

if [ ! -z "${NPM_TOKEN}" ] && [ ! -f "/workspace/DisMAL.js/.npmrc" ]; then
  printf "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" >> /workspace/DisMAL.js/.npmrc
fi