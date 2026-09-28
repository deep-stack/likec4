import { expect, it } from 'vitest'
import { Builder } from '../Builder'

it('preserves advanced UML data through immutable Builder clones', () => {
  const original = Builder.forSpecification({ elements: { type: {} } }).builder
  const uml = { annotations: [{ id: 'n', name: 'n', kind: 'note' as const, text: 'Example', targets: [] }] }
  const next = original.withUml(uml)
  expect(original.build().uml).toBeUndefined()
  expect(next.clone().build().uml).toEqual(uml)
  expect(Builder.fromParsed(next.build()).build().uml).toEqual(uml)
})
it('allows recursive associations and rejects recursive inheritance', () => {
  const { builder, model: { model, type, rel } } = Builder.forSpecification({ elements: { type: {} } })
  const make = (kind: 'association' | 'generalization') =>
    builder.with(model(
      type('a', { classifier: { kind: 'class' } }),
      rel('a', 'a', { uml: { id: 'recursive', kind, source: { id: 'from' }, target: { id: 'to' } } }),
    ))
  expect(make('association').build().relations).toBeDefined()
  expect(() => make('generalization').toLikeC4Model()).toThrow(/cycle/)
})
