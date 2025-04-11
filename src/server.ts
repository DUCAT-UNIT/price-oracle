import express from 'express'
import cors    from 'cors'

import { PriceGenerator }  from './lib/generate.js'
import { get_price_quote } from './lib/quote.js'

import * as CONST  from './const.js'
import * as Crypto from './lib/crypto.js'
import * as Util   from './lib/util.js'

/* Server Init */

// Compute an ECDSA public key from the signing secret.
const oracle_pk = Crypto.get_pubkey(CONST.SIGN_SECRET)
// Initialize the price generator.
const price_gen = new PriceGenerator(CONST.GEN_CONFIG)
// Create a connector to the price generator.
const connector = price_gen.simulate.bind(price_gen)
// Initialize the express server.
const app = express()
// Configure CORS for requests.
app.use(cors())

/* Server Logic */

app.get('/api/quote', (req, res) => {
  // Parse the current timestamp from the query parameters.
  const curr_stamp = Util.parse_uint(req.query.cs) ?? Util.now()
  // Parse the price threshold.
  const req_thold  = Util.parse_uint(req.query.th)
  // Parse the price timestamp.
  const req_stamp  = Util.parse_uint(req.query.ts) ?? curr_stamp
  // Check if the threshold is valid.
  if (req_thold === null) {
    res.status(400).send('invalid threshold: ' + req.query.th)
    return
  }

  try {
    // Fetch a price quote from the generator.
    const quote = get_price_quote(
      connector,
      oracle_pk,
      req_thold,
      req_stamp,
      curr_stamp
    )
    // Return the price quote.
    res.json(quote)
  } catch (err) {
    // Log the error and return a 500 error.
    console.error(err)
    res.status(500).send(err.message)
  }
})

// Start the express server.
app.listen(CONST.SERVER_PORT, () => {
  console.log('Price oracle server running on port: ' + CONST.SERVER_PORT)
})
