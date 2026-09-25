import { Graphviz } from '@hpcc-js/wasm-graphviz'
import { Builder } from '@likec4/core/builder'
import { describe, expect, it } from 'vitest'
import { ElementViewPrinter } from './ElementViewPrinter'
import { parseGraphvizJson } from './GraphvizParser'

describe('table field layout', () => {
  it.each([false, true])('routes field rows with shape override %s', async (overrideShape) => {
    const { builder, model: { model, record, rel }, views: { views, view, $include } } = Builder.forSpecification({
      elements: { record: { style: { shape: 'table' } } },
    })
    const table = {
      fields: [
        { id: 'id', title: 'Identifier', type: 'uuid' },
        { id: 'tenant', title: 'Tenant', type: 'uuid' },
      ],
    }
    const computed = builder.with(
      model(
        record('a', { table }),
        record('b', { table }),
        rel('a', 'b', {
          tableRelation: { pairs: [{ source: 'id', target: 'id' }, { source: 'tenant', target: 'tenant' }] },
        }),
        rel('a', 'a', { tableRelation: { pairs: [{ source: 'id', target: 'tenant' }] } }),
      ),
      views(view('index', $include('*'))),
    ).toLikeC4Model()
    const initial = computed.view('index').$view
    if (initial._type !== 'element') throw new Error('Expected an element view')
    const source = overrideShape
      ? { ...initial, nodes: initial.nodes.map(node => ({ ...node, shape: 'rectangle' as const })) }
      : initial
    const dot = new ElementViewPrinter(source, computed.$styles).print()
    const graphviz = await Graphviz.load()
    const layout = parseGraphvizJson(JSON.parse(graphviz.layout(dot, 'json', undefined, { yInvert: true })), source)
    expect(layout.edges).toHaveLength(2)
    for (const edge of layout.edges) {
      expect(edge.tablePaths).toHaveLength(edge.tableRelation!.pairs.length)
      const from = layout.nodes.find(node => node.id === edge.source)!
      const to = layout.nodes.find(node => node.id === edge.target)!
      edge.tablePaths!.forEach((points, index) => {
        const pair = edge.tableRelation!.pairs[index]!
        expect(points[0]![1]).toBeCloseTo(from.y + 58 + table.fields.findIndex(f => f.id === pair.source) * 36, 0)
        expect(points.at(-1)![1]).toBeCloseTo(to.y + 58 + table.fields.findIndex(f => f.id === pair.target) * 36, 0)
      })
    }
  })
})
