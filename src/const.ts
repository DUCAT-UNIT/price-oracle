
import { now, parse_uint } from './lib/util.js'
import generator_config    from '../config.json' assert { type: 'json' }

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

export const GEN_CONFIG    = generator_config
export const DOMAIN        = 'exchange/quote'
export const PRICE_IVAL    = (60 * 5) // 5 minutes
export const GENESIS_STAMP = now() - 60 * 60 * 24 * 90 // 90 days ago

console.log(`[ const ] genesis stamp  : ${GENESIS_STAMP}`)
console.log(`[ const ] price interval : ${PRICE_IVAL}`)

export const ORACLE_TIME_WINDOW_MIN = 60 * 60 * 24 * 2
export const ORACLE_TIME_WINDOW_MAX = PRICE_IVAL * 2

export const QUEUE_INTERVAL = 500 // 500ms between requests

export const HMAC_SECRET     = process.env['HMAC_SECRET']
export const ORACLE_API_KEY  = process.env['ORACLE_API_KEY']
export const ORACLE_API_HOST = process.env['ORACLE_API_HOST']
export const SIGN_SECRET     = process.env['SIGN_SECRET']
export const SERVER_PORT     = parse_uint(process.env['SERVER_PORT']) ?? DEFAULT_PORT

