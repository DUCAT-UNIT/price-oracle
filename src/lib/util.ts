import { Assert }     from './validate.js'
import { PRICE_IVAL } from '../const.js'

const ec = new TextEncoder()

export function now () {
  return Math.floor(Date.now() / 1000)
}

export function serialize_json (
  json : object
) : Uint8Array {
  const str = JSON.stringify(json)
  return ec.encode(str)
}

export function parse_uint (
  value : unknown
) : number | null {
  try {
    const uint = Number(value)
    Assert.is_uint(uint)
    return uint
  } catch {
    return null
  }
}

export function get_nearest_ival (
  stamp : number,
  ival  : number = PRICE_IVAL
) : number {
  return Math.floor(stamp / ival) * ival
}
