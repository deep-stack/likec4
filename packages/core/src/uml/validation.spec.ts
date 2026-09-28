import { expect, it } from 'vitest'
import { Builder } from '../builder/Builder'
import type { UmlClassifier } from '../types'
import { validateUmlModel } from './validation'

function model(classifier: UmlClassifier) {
  const { builder, model: { model, type } } = Builder.forSpecification({ elements: { type: {} } })
  return builder.with(model(type('a', { classifier }))).build()
}
it('accepts external types and distinct overload signatures', () => {
  expect(validateUmlModel(model({
    kind: 'class',
    operations: [
      { id: 'byId', name: 'find', parameters: [{ id: 'id', name: 'id', type: { external: 'UUID' } }] },
      { id: 'byName', name: 'find', parameters: [{ id: 'name', name: 'name', type: { external: 'String' } }] },
    ],
  }))).toEqual([])
})
it('rejects duplicate member ids', () => {
  expect(
    validateUmlModel(model({ kind: 'class', attributes: [{ id: 'x', name: 'first' }, { id: 'x', name: 'second' }] })),
  )
    .toEqual(expect.arrayContaining([expect.objectContaining({ code: 'uml.duplicate-id' })]))
})
it('rejects invalid runtime multiplicities and unresolved declared types', () => {
  expect(
    validateUmlModel(
      model({
        kind: 'class',
        attributes: [{ id: 'x', name: 'x', type: { classifier: 'missing' }, multiplicity: { lower: 2, upper: 1 } }],
      }),
    ),
  )
    .toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'uml.invalid-multiplicity' }),
      expect.objectContaining({ code: 'uml.unknown-classifier' }),
    ]))
})
it('rejects static abstract operations', () => {
  expect(validateUmlModel(model({ kind: 'class', operations: [{ id: 'x', name: 'x', static: true, abstract: true }] })))
    .toEqual(expect.arrayContaining([expect.objectContaining({ code: 'uml.incompatible-modifiers' })]))
})
it('rejects missing association ends and annotation members', () => {
  const data = model({ kind: 'class' })
  data.uml = {
    associations: [{ id: 'a', name: 'a', ends: [{ id: 'x', element: 'a' }] }],
    annotations: [{
      id: 'note',
      name: 'note',
      kind: 'note',
      text: 'check',
      targets: [{ element: 'a', member: 'absent' }],
    }],
  }
  expect(validateUmlModel(data)).toEqual(expect.arrayContaining([
    expect.objectContaining({ code: 'uml.invalid-arity' }),
    expect.objectContaining({ code: 'uml.unknown-member' }),
  ]))
})
