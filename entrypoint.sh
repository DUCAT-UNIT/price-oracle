#!/usr/bin/env bash

## Ensure that data directory exists.
mkdir -p -m 777 "/data/price-oracle"

## Ensure that data directory has full permissions.
chmod -R 777 "/data/price-oracle"

## Start the main process.
bun run start --conf=/config/price-oracle.json
