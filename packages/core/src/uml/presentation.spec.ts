import { expect, it } from 'vitest'
import { umlAttributeText, umlOperationText, umlRelationshipPresentation, umlSections } from './presentation'
it('formats member semantics independently from geometry', () => {
  expect(
    umlAttributeText({
      id: 'a',
      name: 'total',
      derived: true,
      visibility: 'private',
      type: { external: 'Money' },
      readOnly: true,
    }),
  ).toBe('- /total: Money {readOnly}')
  expect(umlOperationText({ id: 'f', name: 'find', visibility: 'public', returns: { type: { external: 'Item' } } }))
    .toBe('+ find(): Item')
  expect(umlSections({ kind: 'class', operations: [{ id: 'f', name: 'find', static: true }] })[1]?.rows[0]?.static)
    .toBe(true)
})
it('places composition markers at the authored whole end', () => {
  expect(
    umlRelationshipPresentation({
      id: 'a',
      kind: 'association',
      source: { id: 's', aggregation: 'composite' },
      target: { id: 't' },
    }),
  )
    .toEqual({ line: 'solid', head: 'none', tail: 'diamond' })
})
