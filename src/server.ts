import express from 'express'
import cors    from 'cors'

import { PriceOracle }     from './class/price.js'
import { PriceFetcher }    from './fetcher/index.js'
import { get_price_quote } from './lib/quote.js'

import * as CONST  from './const.js'
import * as Crypto from './lib/crypto.js'
import * as Util   from './lib/util.js'

/* Server Init */

// Compute an ECDSA public key from the signing secret.
const oracle_pk = Crypto.get_pubkey(CONST.SIGN_SECRET)
const fetcher   = PriceFetcher.gecko
const oracle    = new PriceOracle('test/db.sqlite', fetcher)

// Initialize the express server.
const app = express()
// Configure CORS for requests.
app.use(cors())

/* Server Logic */

app.get('/api/quote', async (req, res) => {
  // Parse the current timestamp from the query parameters.
  const curr_stamp = Util.parse_uint(req.query.cs) ?? Util.now()
  // Parse the price timestamp.
  const req_stamp  = Util.parse_uint(req.query.ts) ?? curr_stamp
  // Parse the price threshold.
  const req_thold  = Util.parse_uint(req.query.th)
  // Check if the threshold is valid.
  if (req_thold === null) {
    res.status(400).send('invalid threshold: ' + req.query.th)
    return
  }
  try {
    // Ensure that the price timestamp is not from the future.
    const query_stamp = Math.min(req_stamp, curr_stamp)
    // Fetch the price interval data from the connector.
    const price_data  = await oracle.api.get_stop_price({
      close_stamp : curr_stamp,
      start_stamp : query_stamp,
      thold_price : req_thold
    })
    // Create a price quote from the price data.
    const quote = await get_price_quote (oracle_pk, price_data, req_thold)
    // Return the price quote.
    res.json(quote)
  } catch (err) {
    // Log the error and return a 500 error.
    console.error(err)
    res.status(500).send(err instanceof Error ? err.message : 'Unknown error')
  }
})

// Start the price oracle.
oracle.start_polling()

// Start the express server.
app.listen(CONST.SERVER_PORT, () => {
  console.log('Price oracle server running on port: ' + CONST.SERVER_PORT)
})
