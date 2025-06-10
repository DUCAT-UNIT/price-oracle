import { now, parse_uint } from './lib/util.js'

import load_config from './config.js'
import OVERRIDES   from './config/override.json'  assert { type: 'json' }
import GENERATOR   from './config/generator.json' assert { type: 'json' }

/* Environment Variables */

if (process.env['HMAC_SECRET'] === undefined) {
  throw new Error('HMAC_SECRET variable is undefined.')
}

if (process.env['SIGN_SECRET'] === undefined) {
  throw new Error('SIGN_SECRET variable is undefined.')
}

if (process.env['ORACLE_API_KEY'] === undefined) {
  throw new Error('ORACLE_API_KEY variable is undefined.')
}

if (process.env['ORACLE_API_HOST'] === undefined) {
  throw new Error('ORACLE_API_HOST variable is undefined.')
}

if (process.env['SERVER_PORT'] === undefined) {
  throw new Error('SERVER_PORT variable is undefined.')
}

/* Set a genesis stamp based on the environment variable. */

export let GENESIS_STAMP = now() - 60 * 60 * 24 * 90 // Default to 90 days ago.

if (process.env['GENESIS_STAMP'] !== undefined) {
  GENESIS_STAMP = parse_uint(process.env['GENESIS_STAMP']) ?? GENESIS_STAMP
}

/* Exported Configuration */

export const DOMAIN     = 'exchange/quote'
export const PRICE_IVAL = 5
export const CONFIG     = await load_config()

console.log(`[ const ] genesis stamp  : ${GENESIS_STAMP}`)
console.log(`[ const ] price interval : ${PRICE_IVAL}`)

export const QUEUE_INTERVAL = 500 // 500ms between requests

export const HMAC_SECRET     = process.env['HMAC_SECRET']
export const ORACLE_API_KEY  = process.env['ORACLE_API_KEY']
export const ORACLE_API_HOST = process.env['ORACLE_API_HOST']
export const SIGN_SECRET     = process.env['SIGN_SECRET']
export const SERVER_PORT     = parse_uint(process.env['SERVER_PORT'] ?? 8082)

export { OVERRIDES, GENERATOR }