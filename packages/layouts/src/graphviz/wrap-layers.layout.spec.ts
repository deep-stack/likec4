import { Builder } from '@likec4/core/builder'
import { describe, expect, it } from 'vitest'
import { GraphvizLayouter } from './GraphvizLayoter'
import { parseGraphvizJson } from './GraphvizParser'
import { layoutQuality } from './layout-quality'
import { GraphvizWasmAdapter } from './wasm/GraphvizWasmAdapter'
import { frameZoom } from './wrap-layers'

// A shop where many services use one database: Graphviz draws the services as one long column.
function shop(direction: 'LR' | 'TB') {
  const { builder, model: { model, service, store, rel }, views: { views, view, $include } } = Builder
    .forSpecification({ elements: { service: {}, store: {} } })
  const computed = builder.with(
    model(
      store('db', { title: 'Shop database' }),
      service('cart', { title: 'Cart service' }),
      service('orders', { title: 'Order service' }),
      service('stock', { title: 'Stock service' }),
      service('prices', { title: 'Price service' }),
      service('search', { title: 'Search service' }),
      service('reviews', { title: 'Review service' }),
      service('mail', { title: 'Mail service' }),
      service('reports', { title: 'Report service' }),
      service('images', { title: 'Image service' }),
      service('payments', { title: 'Payment service' }),
    ),
    model(
      rel('cart', 'db', { title: 'reads and writes' }),
      rel('orders', 'db', { title: 'reads and writes' }),
      rel('stock', 'db', { title: 'reads and writes' }),
      rel('prices', 'db', { title: 'reads and writes' }),
      rel('search', 'db', { title: 'reads and writes' }),
      rel('reviews', 'db', { title: 'reads and writes' }),
      rel('mail', 'db', { title: 'reads and writes' }),
      rel('reports', 'db', { title: 'reads and writes' }),
      rel('images', 'db', { title: 'reads and writes' }),
      rel('payments', 'db', { title: 'reads and writes' }),
    ),
    views(view('shop', $include('*'))),
  ).toLikeC4Model()
  const shopView = computed.view('shop').$view
  if (shopView._type !== 'element') throw new Error('Expected an element view')
  return { view: { ...shopView, autoLayout: { ...shopView.autoLayout, direction } }, styles: computed.$styles }
}

const size = (nodes: ReadonlyArray<{ x: number; y: number; width: number; height: number }>) => ({
  width: Math.max(...nodes.map(n => n.x + n.width)) - Math.min(...nodes.map(n => n.x)),
  height: Math.max(...nodes.map(n => n.y + n.height)) - Math.min(...nodes.map(n => n.y)),
})

describe('wrapping long ranks in the layout', () => {
  it('wraps a long left-to-right rank, and routes every edge without more clutter', async () => {
    const layouter = new GraphvizLayouter(new GraphvizWasmAdapter())
    const params = shop('LR')
    const dotOnly = await layouter.dotToJson(await layouter.dot(params))
    const { diagram, dot } = await layouter.layout(params)
    expect(dot).toMatch(/layout\s*=\s*"?nop"?/)
    const services = diagram.nodes.filter(n => n.id !== 'db')
    expect(new Set(services.map(n => n.x)).size).toBeGreaterThan(1)
    expect(diagram.edges).toHaveLength(10)
    const wrapped = size(diagram.nodes)
    const unwrapped = size(parseGraphvizJson(dotOnly, params.view).nodes)
    expect(frameZoom(wrapped.width, wrapped.height)).toBeGreaterThan(frameZoom(unwrapped.width, unwrapped.height))
    expect(layoutQuality(diagram.nodes, diagram.edges).edgesOverNodes).toBe(0)
  })

  it('keeps a top-to-bottom view as Graphviz drew it', async () => {
    const layouter = new GraphvizLayouter(new GraphvizWasmAdapter())
    const { dot } = await layouter.layout(shop('TB'))
    expect(dot).toMatch(/layout\s*=\s*"?dot"?/)
  })
})
