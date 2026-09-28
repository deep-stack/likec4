import { expect, it } from 'vitest'
import { moveUmlSpline, wrapUmlText } from './uml'
it('moves both ends of a routed spline when compartments resize', () => {
  const old = { x: 0, y: 0, width: 200, height: 200 }
  const next = { ...old, height: 100 }
  const result = moveUmlSpline([[200, 150], [250, 150], [250, 50], [200, 50]], old, old, next, next)
  expect(result[0]).toEqual([200, 75])
  expect(result.at(-1)).toEqual([200, 25])
  expect(result[1]![0]).toBe(250)
})
it('wraps unicode without splitting surrogate pairs and rejects invalid widths', () => {
  expect(wrapUmlText('a😀b', 2)).toEqual(['a😀', 'b'])
  expect(() => wrapUmlText('hello', 0)).toThrow()
})
