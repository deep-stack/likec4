import type { NodeId } from '@likec4/core'
import { describe, expect, it } from 'vitest'
import { layoutQuality } from './layout-quality'

const id = (value: string) => value as NodeId
const node = (name: string, x: number, y: number, parent: string | null = null, children: string[] = []) => ({
  id: id(name),
  x,
  y,
  width: 100,
  height: 60,
  parent: parent ? id(parent) : null,
  children: children.map(id),
})
// A straight edge as one cubic segment.
const edge = (source: string, target: string, from: [number, number], to: [number, number]) => ({
  source: id(source),
  target: id(target),
  labelBBox: null,
  points: [from, from, to, to] as [[number, number], ...Array<[number, number]>],
})

describe('layoutQuality', () => {
  it('counts edges that cross each other and edges through a group neither end is in', () => {
    const nodes = [
      node('cart', 0, 0),
      node('orders', 400, 300),
      node('stock', 0, 300),
      node('prices', 400, 0),
      { ...node('billing', 150, 100, null, ['invoices']), width: 200, height: 200 },
      node('invoices', 170, 120, 'billing'),
    ]
    const quality = layoutQuality(nodes, [
      edge('cart', 'orders', [50, 30], [450, 330]),
      edge('stock', 'prices', [50, 345], [450, 30]),
    ])
    expect(quality.edgeCrossings).toBe(1)
    expect(quality.edgesThroughGroups).toBe(2)
  })
})
