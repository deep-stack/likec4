import { describe, expect, it } from 'vitest'
import { formatUmlMultiplicity, parseUmlMultiplicity, umlScopedId } from './identity'

describe('UML identities and multiplicities', () => {
  it.each([
    ['0..*', { lower: 0, upper: '*' }],
    ['*', { lower: 0, upper: '*' }],
    ['1', { lower: 1, upper: 1 }],
    ['2..5', { lower: 2, upper: 5 }],
  ])('parses %s', (source, value) => expect(parseUmlMultiplicity(source)).toEqual(value))
  it.each(['3..1', '-1', '0.5', '', '1..', '1..2..3', '9007199254740992'])('rejects %s', value => {
    expect(() => parseUmlMultiplicity(value)).toThrow()
  })
  it('formats canonical bounds', () => {
    expect(formatUmlMultiplicity({ lower: 1, upper: 1 })).toBe('1')
    expect(formatUmlMultiplicity({ lower: 0, upper: '*' })).toBe('0..*')
  })
  it('keeps owners and local identifiers unambiguous', () => {
    expect(umlScopedId('a.b', 'c')).not.toBe(umlScopedId('a', 'b.c'))
    expect(umlScopedId('Customer', 'findById')).not.toBe(umlScopedId('Customer', 'findByName'))
  })
})
