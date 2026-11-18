import type { NodeId } from '@likec4/core'
import { describe, expect, it } from 'vitest'
import { frameZoom, wrapLayers } from './wrap-layers'

const box = (id: string, x: number, y: number) => ({ id: id as NodeId, x, y, width: 320, height: 180 })

// A left-to-right layout as Graphviz draws it: one long rank of 12 nodes, then a rank of 3.
const tall = [
  ...Array.from({ length: 12 }, (_, i) => box(`a${i}`, 0, i * 240)),
  ...Array.from({ length: 3 }, (_, i) => box(`b${i}`, 600, 1000 + i * 240)),
]

describe('wrapLayers', () => {
  it('splits a long rank into rows that keep Graphviz order, and opens larger', () => {
    const wrapped = wrapLayers(tall, 'LR')
    expect(wrapped).not.toBeNull()
    const places = [...wrapped!.entries()]
    const columns = new Set(places.filter(([id]) => id.startsWith('a')).map(([, p]) => p.x))
    expect(columns.size).toBeGreaterThan(1)
    // Row by row: the first node of the rank is in the first row and column.
    const first = wrapped!.get('a0' as NodeId)!
    expect(places.every(([, p]) => p.y >= first.y)).toBe(true)
    const width = Math.max(...places.map(([, p]) => p.x + 320))
    const height = Math.max(...places.map(([, p]) => p.y + 180))
    expect(frameZoom(width, height)).toBeGreaterThan(frameZoom(920, 12 * 240 - 60) * 1.15)
  })

  it('keeps a layout that already fits the frame', () => {
    const chain = [box('a', 0, 0), box('b', 600, 0), box('c', 1200, 0)]
    expect(wrapLayers(chain, 'LR')).toBeNull()
  })
})
