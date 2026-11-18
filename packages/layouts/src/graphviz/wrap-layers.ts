import type { NodeId } from '@likec4/core'

/** The frame a diagram is usually shown in, in pixels: as wide as a page of text, and not taller than a window. */
export interface WrapFrame {
  width: number
  height: number
}

export const DEFAULT_WRAP_FRAME: WrapFrame = { width: 1100, height: 800 }

type Direction = 'TB' | 'BT' | 'LR' | 'RL'

interface Box {
  id: NodeId
  x: number
  y: number
  width: number
  height: number
}

/** Padding the viewer keeps around a fitted diagram, in pixels. */
const PADDING = 24
/** Space between the columns a wrapped layer is split into, in pixels. */
const COLUMN_GAP = 60
/** Wrapping must make the diagram open at least this much larger, so small changes do not flip the layout. */
const MIN_GAIN = 1.15
/** A diagram that opens at this zoom or larger reads well, and keeps the layout Graphviz chose. */
export const READABLE_ZOOM = 0.5
/** Extra space between the rows of a wrapped rank, for the edges that pass between them and their labels. */
const ROW_ROOM = 48
/** A candidate this close to the largest one is as good, and wins when it wraps fewer ranks. */
const CLOSE_ENOUGH = 0.9
/** How many candidates to offer, largest first. */
const CANDIDATES = 3

/**
 * The zoom at which a diagram of this size fits the frame. The frame is as wide as given and as tall as the diagram's
 * shape needs, up to the frame's height.
 */
export function frameZoom(width: number, height: number, frame: WrapFrame = DEFAULT_WRAP_FRAME): number {
  const shown = Math.max(280, Math.min((frame.width * height) / width, frame.height))
  return Math.min((frame.width - 2 * PADDING) / width, (shown - 2 * PADDING) / height)
}

/**
 * Graphviz puts every node of a rank on one line, so a rank of many nodes makes a long, thin diagram that opens too
 * small to read. This splits long ranks into a few shorter lines side by side, keeping Graphviz's order row by row,
 * so nodes stay level with the nodes they connect to.
 *
 * Returns up to three placements, best first: each gives the new top-left position of every node and makes the
 * diagram open at least 15% larger in the frame. A placement that wraps fewer ranks comes first when it opens almost
 * as large. Returns none when the diagram already reads well.
 */
export function wrapLayers(
  boxes: readonly Box[],
  direction: Direction,
  frame: WrapFrame = DEFAULT_WRAP_FRAME,
): Array<Map<NodeId, { x: number; y: number }>> {
  if (boxes.length < 3) {
    return []
  }
  // Work along the ranks (u) and across them (v), whatever the direction.
  const across = direction === 'LR' || direction === 'RL'
  const nodes = boxes.map(box => ({
    id: box.id,
    u: across ? box.x : box.y,
    v: across ? box.y : box.x,
    uSize: across ? box.width : box.height,
    vSize: across ? box.height : box.width,
  }))
  type Item = (typeof nodes)[number]

  // The nodes of a rank share their centre along u.
  const sorted = [...nodes].sort((a, b) => a.u + a.uSize / 2 - (b.u + b.uSize / 2))
  const layers: Item[][] = []
  for (const node of sorted) {
    const last = layers.at(-1)
    const first = last?.[0]
    if (last && first && Math.abs(first.u + first.uSize / 2 - (node.u + node.uSize / 2)) <= 2) {
      last.push(node)
    } else {
      layers.push([node])
    }
  }
  for (const layer of layers) {
    layer.sort((a, b) => a.v - b.v)
  }
  const longest = Math.max(...layers.map(layer => layer.length))
  if (longest < 3) {
    return []
  }

  // Keep the space Graphviz left between ranks, where edge labels are, and between nodes in a rank.
  const extent = (layer: Item[]) => ({
    start: Math.min(...layer.map(n => n.u)),
    end: Math.max(...layer.map(n => n.u + n.uSize)),
  })
  const rankGaps = layers.slice(1).map((layer, i) => Math.max(40, extent(layer).start - extent(layers[i]!).end))
  const crossGap = (layer: Item[]) => {
    const gaps = layer.slice(1).map((n, i) => n.v - (layer[i]!.v + layer[i]!.vSize))
    return gaps.length ? Math.max(30, Math.min(...gaps)) : 30
  }

  const place = (rows: number) => {
    const placed = new Map<NodeId, { u: number; v: number; uSize: number; vSize: number }>()
    let u = 0
    let wrapped = 0
    layers.forEach((layer, index) => {
      const columns = Math.ceil(layer.length / rows)
      const cellU = Math.max(...layer.map(n => n.uSize))
      const cellV = Math.max(...layer.map(n => n.vSize))
      const gap = crossGap(layer) + (columns > 1 ? ROW_ROOM : 0)
      if (columns > 1) {
        wrapped++
      }
      const height = Math.ceil(layer.length / columns) * (cellV + gap) - gap
      layer.forEach((node, i) => {
        // Row by row: the first nodes in Graphviz's order fill the first row.
        const row = Math.floor(i / columns)
        const column = i % columns
        placed.set(node.id, {
          u: u + column * (cellU + COLUMN_GAP) + (cellU - node.uSize) / 2,
          v: -height / 2 + row * (cellV + gap) + (cellV - node.vSize) / 2,
          uSize: node.uSize,
          vSize: node.vSize,
        })
      })
      u += columns * (cellU + COLUMN_GAP) - COLUMN_GAP + (rankGaps[index] ?? 0)
    })
    const values = [...placed.values()]
    const minU = Math.min(...values.map(p => p.u))
    const minV = Math.min(...values.map(p => p.v))
    const sizeU = Math.max(...values.map(p => p.u + p.uSize)) - minU
    const sizeV = Math.max(...values.map(p => p.v + p.vSize)) - minV
    const [width, height] = across ? [sizeU, sizeV] : [sizeV, sizeU]
    return { placed, minU, minV, wrapped, zoom: frameZoom(width, height, frame) }
  }

  const original = (() => {
    const minX = Math.min(...boxes.map(b => b.x))
    const minY = Math.min(...boxes.map(b => b.y))
    const width = Math.max(...boxes.map(b => b.x + b.width)) - minX
    const height = Math.max(...boxes.map(b => b.y + b.height)) - minY
    return frameZoom(width, height, frame)
  })()

  if (original >= READABLE_ZOOM) {
    return []
  }
  const placements = Array.from({ length: longest - 1 }, (_, i) => place(longest - 1 - i))
    .filter(candidate => candidate.wrapped > 0 && candidate.zoom >= original * MIN_GAIN)
  const best = Math.max(0, ...placements.map(p => p.zoom))
  const close = (p: (typeof placements)[number]) => p.zoom >= best * CLOSE_ENOUGH
  placements.sort((a, b) => Number(close(b)) - Number(close(a)) || a.wrapped - b.wrapped || b.zoom - a.zoom)

  const reversed = direction === 'RL' || direction === 'BT'
  return placements.slice(0, CANDIDATES).map(({ placed, minU, minV }) => {
    const sizeU = Math.max(...[...placed.values()].map(p => p.u + p.uSize)) - minU
    const result = new Map<NodeId, { x: number; y: number }>()
    for (const [id, p] of placed) {
      const u = reversed ? sizeU - (p.u - minU) - p.uSize : p.u - minU
      const v = p.v - minV
      result.set(id, across ? { x: u, y: v } : { x: v, y: u })
    }
    return result
  })
}
