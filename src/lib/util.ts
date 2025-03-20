import { Buff, Bytes } from '@cmdcode/buffy'

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

export namespace Check {
  
  export function exists <T> (
    value ?: T | null
  ) : value is NonNullable<T> {
    if (typeof value === 'undefined' || value === null) {
      return false
    }
    return true
  }

  export function is_uint (
    value : unknown,
    max_val = Number.MAX_SAFE_INTEGER
  ) : value is number {
    if (typeof value === 'string') {
      value = Number(value)
    }
    return (
      typeof value === 'number' &&
      !isNaN(value)             &&
      value >= 0                &&
      value <= max_val          &&
      Math.floor(value) === value
    )
  }

  export function is_hex (
    value : unknown
  ) : value is string {
    if (
      typeof value === 'string'            &&
      value.match(/[^a-fA-F0-9]/) === null &&
      value.length % 2 === 0
    ) {
      return true
    }
    return false
  }

  export function is_hash (value : unknown) : value is string {
    if (is_hex(value) && value.length === 64) {
      return true
    }
    return false
  }
}

export namespace Assert {

  export function ok (
    value    : unknown,
    message ?: string
  ) : asserts value {
    if (value === false) {
      throw new Error(message ?? 'Assertion failed!')
    }
  }

  export function exists <T> (
    value : T | null,
    msg  ?: string
    ) : asserts value is NonNullable<T> {
    if (!Check.exists(value)) {
      throw new Error(msg ?? 'Value is null or undefined!')
    }
  }

  export function is_uint (value : unknown) : asserts value is number {
    if (!Check.is_uint(value)) {
      throw new TypeError(`invalid number: ${String(value)}`)
    }
  }

  export function is_hex (value : unknown) : asserts value is string {
    if (!Check.is_hex(value)) {
      throw new TypeError(`invalid hex: ${String(value)}`)
    }
  }

  export function is_hash (value : unknown, msg ?: string) : asserts value is string {
    if (!Check.is_hash(value)) {
      throw new TypeError(msg ?? `invalid hash: ${String(value)}`)
    }
  }

  export function size (input : Bytes, size : number) : void {
    const bytes = Buff.bytes(input)
    if (bytes.length !== size) {
      throw new Error(`Invalid input size: ${bytes.hex} !== ${size}`)
    }
  }
}
