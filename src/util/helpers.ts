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