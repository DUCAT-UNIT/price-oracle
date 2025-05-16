import { now, parse_uint } from './lib/util.js'
import generator_config    from '../config.json'   assert { type: 'json' }

/** Load the price override array from the json file. */

export let OVERRIDES : { price: number, stamp: number }[] = []

try {
    const json = await import('../override.json', { assert: { type: 'json' } })
    OVERRIDES  = Array.isArray(json.default) ? json.default : []
} catch (e) {
    // If override.json doesn't exist, use empty array
    console.log('[ const ] No override.json found, using default empty array');
}

/* Set a genesis stamp based on the environment variable. */

export let GENESIS_STAMP = now() - 60 * 60 * 24 * 90 // Default to 90 days ago.

if (process.env['GENESIS_STAMP'] !== undefined) {
  GENESIS_STAMP = parse_uint(process.env['GENESIS_STAMP']) ?? GENESIS_STAMP
}

/* Default Values */

const DEFAULT_PORT = 8082

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

/* Exported Configuration */

export const GEN_CONFIG = generator_config
export const DOMAIN     = 'exchange/quote'
export const PRICE_IVAL = 30

console.log(`[ const ] genesis stamp  : ${GENESIS_STAMP}`)
console.log(`[ const ] price interval : ${PRICE_IVAL}`)

export const QUEUE_INTERVAL = 500 // 500ms between requests

export const HMAC_SECRET     = process.env['HMAC_SECRET']
export const ORACLE_API_KEY  = process.env['ORACLE_API_KEY']
export const ORACLE_API_HOST = process.env['ORACLE_API_HOST']
export const SIGN_SECRET     = process.env['SIGN_SECRET']
export const SERVER_PORT     = parse_uint(process.env['SERVER_PORT']) ?? DEFAULT_PORT
