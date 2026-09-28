import { expect, it } from 'vitest'
import { Builder } from '../builder/Builder'
import type { UmlClassifier } from '../types'

it.each(['class', 'interface', 'dataType', 'primitiveType', 'package', 'enumeration'] as const)(
  'preserves %s definitions through Builder and JSON',
  kind => {
    const classifier: UmlClassifier = { kind, stereotypes: ['domain'] }
    const { builder, model: { model, type } } = Builder.forSpecification({ elements: { type: {} } })
    const data = builder.with(model(type('a', { classifier }))).build()
    expect(JSON.parse(JSON.stringify(data)).elements.a.classifier).toEqual(classifier)
    expect(Builder.fromParsed(data).build().elements.a.classifier).toEqual(classifier)
  },
)
it('preserves overload identities and structured parameter information', () => {
  const classifier: UmlClassifier = {
    kind: 'class',
    operations: [
      {
        id: 'findById',
        name: 'find',
        parameters: [{ id: 'key', name: 'key', type: { external: 'UUID' }, direction: 'in' }],
      },
      { id: 'findByName', name: 'find', parameters: [{ id: 'name', name: 'name', type: { external: 'String' } }] },
    ],
  }
  const { builder, model: { model, type } } = Builder.forSpecification({ elements: { type: {} } })
  expect(Builder.fromParsed(builder.with(model(type('a', { classifier }))).build()).build().elements.a.classifier)
    .toEqual(classifier)
})
it('keeps legacy model data free of UML requirements', () => {
  const data = Builder.forSpecification({ elements: { type: {} } }).builder.build()
  expect(Builder.fromParsed(data).build()).toEqual(data)
})
