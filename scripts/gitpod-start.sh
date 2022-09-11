#!/bin/bash

if [ ! -z "${NPM_TOKEN}" ] && [ ! -f "/workspace/TSON/.npmrc" ]; then
  printf "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" >> /workspace/TSON/.npmrc
fi