import type { NodeId } from '@likec4/core'
import { describe, expect, it } from 'vitest'
import { packGroups } from './pack-groups'

const id = (value: string) => value as NodeId

// Three groups Graphviz stacked one under another, each with two nodes side by side.
function stacked() {
  return ['shop', 'billing', 'search'].flatMap((name, i) => {
    const top = i * 600
    return [
      {
        id: id(name),
        parent: null,
        children: [id(`${name}.a`), id(`${name}.b`)],
        x: 0,
        y: top,
        width: 900,
        height: 500,
      },
      { id: id(`${name}.a`), parent: id(name), children: [], x: 40, y: top + 60, width: 320, height: 180 },
      { id: id(`${name}.b`), parent: id(name), children: [], x: 540, y: top + 60, width: 320, height: 180 },
    ]
  })
}

describe('packGroups', () => {
  it('puts stacked groups in columns and moves each group with its nodes', () => {
    const [packed] = packGroups(stacked())
    expect(packed).toBeDefined()
    const columns = new Set(['shop', 'billing', 'search'].map(name => packed!.get(id(name))!.x))
    expect(columns.size).toBeGreaterThan(1)
    for (const name of ['shop', 'billing', 'search']) {
      const group = packed!.get(id(name))!
      const node = packed!.get(id(`${name}.a`))!
      expect([node.x - group.x, node.y - group.y]).toEqual([40, 60])
    }
  })

  it('keeps a view with a node outside the groups', () => {
    const boxes = [...stacked(), {
      id: id('loose'),
      parent: null,
      children: [],
      x: 1200,
      y: 0,
      width: 320,
      height: 180,
    }]
    expect(packGroups(boxes)).toEqual([])
  })
})
