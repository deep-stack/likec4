import { Graphviz } from '@hpcc-js/wasm-graphviz'
import { Builder } from '@likec4/core/builder'
import { measureUmlClassifier } from '@likec4/core/geometry'
import { expect, it } from 'vitest'
import { ElementViewPrinter } from './ElementViewPrinter'
import { parseGraphvizJson } from './GraphvizParser'

it('lays out class compartments and both association end labels', async () => {
  const { builder, model: { model, entity, rel }, views: { views, view, $include } } = Builder.forSpecification({
    elements: { entity: {} },
  })
  const classifier = {
    kind: 'class' as const,
    attributes: [{ id: 'name', name: 'name', type: { external: 'String' } }],
  }
  const built = builder.with(
    model(
      entity('a', { title: 'Account', classifier }),
      entity('b', { title: 'Account', classifier }),
      rel('a', 'b', {
        uml: {
          id: 'owns',
          kind: 'association',
          source: { id: 'owner', role: 'owner', multiplicity: { lower: 1, upper: 1 } },
          target: { id: 'items', role: 'items', multiplicity: { lower: 0, upper: '*' } },
        },
      }),
    ),
    views(view('index', $include('*'))),
  ).toLikeC4Model()
  const source = built.view('index').$view
  if (source._type !== 'element') throw new Error('Expected element view')
  const dot = new ElementViewPrinter(source, built.$styles).print()
  expect(dot).toContain('owner')
  expect(dot).toContain('items')
  const graphviz = await Graphviz.load()
  const layout = parseGraphvizJson(JSON.parse(graphviz.layout(dot, 'json', undefined, { yInvert: true })), source)
  const size = measureUmlClassifier(classifier, 'Account')
  expect(layout.nodes[0]!.height).toBeGreaterThanOrEqual(size.height)
  expect(layout.edges[0]).toHaveProperty('umlEndLabels.source')
  expect(layout.edges[0]).toHaveProperty('umlEndLabels.target')
  expect(layout.edges[0]!.labelBBox).toBeNull()
})
