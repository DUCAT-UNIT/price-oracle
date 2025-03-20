
import { parse_uint }   from './lib/util'
import generator_config from '../config.json' assert { type: 'json' }

/* Default Values */

const DEFAULT_PORT = 8082

/* Environment Variables */

if (process.env['HMAC_SECRET'] === undefined) {
  throw new Error('HMAC_SECRET variable is undefined.')
}

if (process.env['SIGN_SECRET'] === undefined) {
  throw new Error('SIGN_SECRET variable is undefined.')
}

if (process.env['SERVER_PORT'] === undefined) {
  throw new Error('SERVER_PORT variable is undefined.')
}

/* Exported Configuration */

export const GEN_CONFIG  = generator_config
export const HMAC_SECRET = process.env['HMAC_SECRET']
export const SIGN_SECRET = process.env['SIGN_SECRET']
export const SERVER_PORT = parse_uint(process.env['SERVER_PORT']) ?? DEFAULT_PORT
