import { PriceGenerator }  from '../lib/generate.js'

import * as CONST  from '../const.js'

// Initialize the price generator.
const price_gen = new PriceGenerator(CONST.GENERATOR)
// Create a connector to the price generator.
const connector = price_gen.simulate.bind(price_gen)

export default connector