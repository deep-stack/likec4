import type { UmlMultiplicity } from '../types/uml'

/** Parse a UML multiplicity without losing precision or accepting partial bounds. */
export function parseUmlMultiplicity(value: string): UmlMultiplicity {
  if (value === '*') return { lower: 0, upper: '*' }
  const match = /^(\d+)(?:\.\.(\d+|\*))?$/.exec(value)
  if (!match) throw new Error(`Invalid UML multiplicity: ${value}`)
  const lower = Number(match[1])
  const upper = match[2] === '*' ? '*' : Number(match[2] ?? match[1])
  if (!Number.isSafeInteger(lower) || (upper !== '*' && (!Number.isSafeInteger(upper) || upper < lower))) {
    throw new Error(`Invalid UML multiplicity: ${value}`)
  }
  return { lower, upper }
}

export function formatUmlMultiplicity(value: UmlMultiplicity): string {
  const text = value.lower === value.upper ? `${value.lower}` : `${value.lower}..${value.upper}`
  parseUmlMultiplicity(text)
  return text
}

/** Length prefixes avoid collisions when authored identifiers contain punctuation. */
export function umlScopedId(owner: string, localId: string): string {
  return `uml:${owner.length}:${owner}:${localId.length}:${localId}`
}
