import { Builder } from '@likec4/core/builder'
import { computeRelationshipsView } from '@likec4/core/compute-view'
import { describe, expect, it } from 'vitest'
import { tablePreview } from '../../likec4diagram/state/tableDisplay'
import { layoutRelationshipsView } from './layout'

// A shop schema: twelve tables refer to the orders table by its id, too many to read in one column.
function shop() {
  const { builder, model: { model, record, rel }, views: { views, view, $include } } = Builder.forSpecification({
    elements: { record: { style: { shape: 'table' } } },
  })
  const fields = (...names: string[]) => names.map(name => ({ id: name, title: name, type: 'text' }))
  const orders = {
    fields: fields('id', 'customer_id', 'placed_at', 'status', 'total', 'currency', 'note', 'source', 'channel', 'tax'),
  }
  const child = { fields: fields('id', 'order_id', 'created_at') }
  const computed = builder.with(
    model(
      record('orders', { title: 'orders', table: orders }),
      record('payments', { title: 'payments', table: child }),
      record('shipments', { title: 'shipments', table: child }),
      record('refunds', { title: 'refunds', table: child }),
      record('invoices', { title: 'invoices', table: child }),
      record('reviews', { title: 'reviews', table: child }),
      record('returns', { title: 'returns', table: child }),
      record('coupons', { title: 'coupons', table: child }),
      record('discounts', { title: 'discounts', table: child }),
      record('notes', { title: 'notes', table: child }),
      record('events', { title: 'events', table: child }),
      record('tags', { title: 'tags', table: child }),
      record('audits', { title: 'audits', table: child }),
    ),
    model(
      rel('payments', 'orders', { tableRelation: { pairs: [{ source: 'order_id', target: 'id' }] } }),
      rel('shipments', 'orders', { tableRelation: { pairs: [{ source: 'order_id', target: 'id' }] } }),
      rel('refunds', 'orders', { tableRelation: { pairs: [{ source: 'order_id', target: 'id' }] } }),
      rel('invoices', 'orders', { tableRelation: { pairs: [{ source: 'order_id', target: 'id' }] } }),
      rel('reviews', 'orders', { tableRelation: { pairs: [{ source: 'order_id', target: 'id' }] } }),
      rel('returns', 'orders', { tableRelation: { pairs: [{ source: 'order_id', target: 'id' }] } }),
      rel('coupons', 'orders', { tableRelation: { pairs: [{ source: 'order_id', target: 'id' }] } }),
      rel('discounts', 'orders', { tableRelation: { pairs: [{ source: 'order_id', target: 'id' }] } }),
      rel('notes', 'orders', { tableRelation: { pairs: [{ source: 'order_id', target: 'id' }] } }),
      rel('events', 'orders', { tableRelation: { pairs: [{ source: 'order_id', target: 'id' }] } }),
      rel('tags', 'orders', { tableRelation: { pairs: [{ source: 'order_id', target: 'id' }] } }),
      rel('audits', 'orders', { tableRelation: { pairs: [{ source: 'order_id', target: 'id' }] } }),
    ),
    views(view('index', $include('*'))),
  ).toLikeC4Model()
  return computed
}

describe('relationships browser with tables', () => {
  it('draws tables as their preview, names links by their fields, and splits a tall column', () => {
    const model = shop()
    const view = model.view('index')
    const data = computeRelationshipsView('orders', model, view.id, 'view')
    const result = layoutRelationshipsView(data, view)

    const orders = result.nodes.find(node => node.modelRef === 'orders')!
    expect(orders.table).toBeDefined()
    // The preview shows the joined key first and as many more fields as fit.
    expect(orders.tableFields).toEqual(['id'])
    const preview = tablePreview(orders.table!, 'orders', new Set(['id']), false)
    expect([orders.width, orders.height]).toEqual([preview.width, preview.height])

    expect(result.edges).toHaveLength(12)
    expect(new Set(result.edges.map(edge => edge.label))).toEqual(new Set(['order_id → id']))

    // The twelve tables no longer stack in one column.
    const incomers = result.nodes.filter(node => node.column === 'incomers' && node.modelRef)
    expect(new Set(incomers.map(node => node.x)).size).toBeGreaterThan(1)
    for (const node of result.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(result.bounds.x)
      expect(node.x + node.width).toBeLessThanOrEqual(result.bounds.x + result.bounds.width)
    }
  })
})
