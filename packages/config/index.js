export function mergeConfig (base, override) {
  return Object.keys({ ...base, ...override }).reduce((result, key) => {
    const baseValue = base[key]
    const overrideValue = override[key]
    result[key] = baseValue && overrideValue && typeof baseValue === 'object' && typeof overrideValue === 'object' && !Array.isArray(baseValue) && !Array.isArray(overrideValue)
      ? mergeConfig(baseValue, overrideValue)
      : overrideValue ?? baseValue
    return result
  }, {})
}

export function readPath (object, key) {
  return key.split('.').reduce((value, part) => value?.[part], object)
}

export function writePath (object, key, value) {
  const parts = key.split('.')
  const last = parts.pop()
  const target = parts.reduce((current, part) => {
    current[part] ||= {}
    return current[part]
  }, object)
  target[last] = value
}

export function parseConfigValue (value) {
  if (value === 'true') return true
  if (value === 'false') return false
  const number = Number(value)
  return Number.isNaN(number) ? value : number
}
