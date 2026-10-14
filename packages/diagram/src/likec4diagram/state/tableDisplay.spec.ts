import type { TableDefinition } from '@likec4/core'
import { describe, expect, it } from 'vitest'
import type { Types } from '../types'
import {
  absolutePosition,
  requiredFields,
  tableDisplayLayout,
  tableDisplayPath,
  tablePreview,
} from './tableDisplay'

const table: TableDefinition = {
  fields: Array.from(
    { length: 20 },
    (_, i) => ({ id: `f${i}`, title: `field${i}`, type: 'text', ...(i === 0 ? { keys: ['primary' as const] } : {}) }),
  ),
}
function node(id: string, x: number, y: number, parentId?: string): Types.Node {
  return {
    id,
    type: 'element',
    position: { x, y },
    width: 340,
    height: 760,
    data: { id, title: id, table, x, y },
    ...(parentId ? { parentId } : {}),
  } as Types.Node
}
const edge = {
  id: 'e',
  source: 'a',
  target: 'b',
  data: { tableRelation: { pairs: [{ source: 'f19', target: 'f17' }, { source: 'f18', target: 'f16' }] } },
} as unknown as Types.Edge

describe('interactive table geometry', () => {
  it('uses a continuous cubic between unobstructed rows without hugging intervening tables', () => {
    const nodes = [node('a', 0, 0), node('b', 1000, 400)]
    const curve = tableDisplayPath(nodes, [edge], {}, 'a', 'b', 'f19', 'f17')!
    expect(curve).toContain(' C ')
    expect(curve).not.toMatch(/ [LQ] /)
    const blocked = tableDisplayPath([...nodes, node('block', 450, 0)], [edge], {}, 'a', 'b', 'f19', 'f17')!
    expect(blocked).toBe(curve)
  })
  it('keeps self-reference curves outside the right edge when compact, expanded or hovered', () => {
    const self = { ...edge, source: 'a', target: 'a' }
    for (const expanded of [false, true]) {
      for (const hovered of [false, true]) {
        const base = node('a', 40, 40)
        base.data.hovered = hovered
        const nodes = tableDisplayLayout([base], [self], { a: expanded })
        const path = tableDisplayPath(nodes, [self], { a: expanded }, 'a', 'a', 'f0', 'f17')!
        const values = path.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
        const [sx, sy, c1x, c1y, c2x, c2y, tx, ty] = values
        expect(sx).toBe(tx)
        expect(c1x).toBeGreaterThan(sx!)
        expect(c2x).toBeGreaterThan(tx!)
        expect(c1y).toBe(sy)
        expect(c2y).toBe(ty)
        expect(ty).toBeGreaterThan(sy!)
      }
    }
  })
  it('keeps composite endpoints and primary keys while leaving the model intact', () => {
    const before = JSON.stringify(table)
    const preview = tablePreview(table, 'a', requiredFields('a', [edge]), false)
    expect(preview.fields.map(f => f.id)).toEqual(['f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f18', 'f19'])
    expect(preview.hidden).toBe(12)
    expect(tablePreview(table, 'a', new Set(table.fields.map(f => f.id)), false).fields).toHaveLength(20)
    expect(tablePreview(table, 'a', new Set(), true).fields).toHaveLength(20)
    expect(JSON.stringify(table)).toBe(before)
  })
  it('compacts without overlap or drift and routes composite edges to visible rows', () => {
    const base = [node('a', 40, 40), node('b', 480, 40), node('c', 40, 1000)]
    const compact = tableDisplayLayout(base, [edge], {})
    const expanded = tableDisplayLayout(base, [edge], { a: true })
    expect(compact[2]!.position.y).toBeLessThan(base[2]!.position.y)
    expect(expanded[2]!.position.y).toBeGreaterThan(expanded[0]!.position.y + expanded[0]!.height!)
    expect(tableDisplayLayout(base, [edge], {})).toEqual(compact)
    for (const pair of [{ source: 'f19', target: 'f17' }, { source: 'f18', target: 'f16' }]) {
      const path = tableDisplayPath(compact, [edge], {}, 'a', 'b', pair.source, pair.target)
      expect(path).not.toBeNull()
      const row = tablePreview(table, 'a', requiredFields('a', [edge]), false).rows.find(r => r.id === pair.source)!
      expect(path).toMatch(`M 380,${40 + row.y + 18}`)
    }
    expect(tableDisplayPath(compact, [edge], {}, 'a', 'a', 'f0', 'f19')).not.toBeNull()
    // React Flow can keep the table width only in measured/initialWidth.
    const measured = compact.map(({ width, ...n }) => ({ ...n, measured: { width: 340, height: n.height! } }))
    expect(tableDisplayPath(measured, [edge], {}, 'a', 'b', 'f19', 'f17')).toMatch(/^M 380,/)
    expect(base[0]!.height).toBe(760)
  })
  it('resizes compound bounds around the compact children', () => {
    const group = {
      id: 'group',
      type: 'compound-element',
      position: { x: 0, y: 0 },
      width: 500,
      height: 2000,
      data: { id: 'group' },
    } as Types.Node
    const nodes = tableDisplayLayout([group, node('a', 40, 60, 'group'), node('b', 40, 1000, 'group')], [], {})
    expect(nodes[0]!.height).toBeLessThan(2000)
    expect(nodes[0]!.height).toBeGreaterThan(nodes[2]!.position.y + nodes[2]!.height!)
    expect(absolutePosition(nodes, 'b').y).toBe(nodes[0]!.position.y + nodes[2]!.position.y)
  })
})
