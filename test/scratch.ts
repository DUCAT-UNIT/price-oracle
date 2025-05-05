import { PriceOracle, PriceQuote }  from '../src/index.js'
import { PriceFetcher } from '../src/fetcher/index.js'
import { now }          from '../src/lib/util.js'
import { secp256k1 } from '@noble/curves/secp256k1'

/* ======== [ Initial Setup ] ======== */

const res   = await fetch('http://localhost:8082/api/quote?th=84800&ts=1745802600')
const quote = await res.json() as PriceQuote

console.log('price quote :', quote)

const { oracle_pk, req_id, req_sig } = quote

const verify_sig = secp256k1.verify(req_sig, req_id, oracle_pk)

console.log('verify sig :', verify_sig)

