import { expect, it } from 'vitest'
import { Builder } from '../builder'

it('computes a separate junction and all legs for a visible n-ary association', () => {
  const { builder, model: { model, entity }, views: { views, view, $include } } = Builder.forSpecification({
    elements: { entity: {} },
  })
  const classifier = { kind: 'class' as const }
  const result = builder.with(
    model(entity('a', { classifier }), entity('b', { classifier }), entity('c', { classifier })),
    views(view('index', $include('*'))),
  )
    .withUml({
      associations: [{
        id: 'supply',
        name: 'Supply',
        ends: ['a', 'b', 'c'].map(element => ({ id: element, element })),
      }],
    })
    .toLikeC4Model().view('index').$view
  expect(result.nodes.filter(n => n.umlOrigin?.id === 'supply')).toHaveLength(1)
  expect(result.edges.filter(e => e.umlOrigin?.id === 'supply')).toHaveLength(3)
  expect(result.nodes.find(n => n.umlOrigin)?.modelRef).toBeUndefined()
})
