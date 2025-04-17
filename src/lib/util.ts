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

export function parse_error (err : unknown) : string {
  if (err instanceof Error) {
    return err.message
  } else if (typeof err === 'string') {
    return err
  } else {
    return String(err)
  }
}

export function normalize_obj <
  T extends Record<keyof T, any>
> (obj : T) : T {
  if (obj instanceof Map || Array.isArray(obj) || typeof obj !== 'object') {
    return obj
  } else {
    return Object.keys(obj)
      .sort()
      .filter(([ _, value ]) => value !== undefined)
      .reduce<Record<string, any>>((sorted, key) => {
        sorted[key] = obj[key as keyof T]
        return sorted
      }, {}) as T
  }
}