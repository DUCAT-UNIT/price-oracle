/**
 * @fileoverview
 * WORK IN PROGRESS.
 * @module src/fetcher/pgen
 */

import { PriceGenerator }  from '../lib/generate.js'

import * as CONST  from '../const.js'

// Initialize the price generator.
const price_gen = new PriceGenerator(CONST.GEN_CONFIG)
// Create a connector to the price generator.
const connector = price_gen.simulate.bind(price_gen)

export default connector