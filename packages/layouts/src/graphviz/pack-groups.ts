import type { NodeId } from '@likec4/core'
import { type WrapFrame, DEFAULT_WRAP_FRAME, frameZoom, READABLE_ZOOM } from './wrap-layers'

interface Box {
  id: NodeId
  parent: NodeId | null
  children: readonly NodeId[]
  x: number
  y: number
  width: number
  height: number
}

/** Space between groups placed side by side or one under another, in pixels. */
const GROUP_GAP = 80
/** Packing must make the diagram open at least this much larger, so small changes do not flip the layout. */
const MIN_GAIN = 1.15

/**
 * Graphviz stacks the groups of a left-to-right view one under another, so a view of a few groups opens tall and
 * narrow. This places the groups in columns instead, in Graphviz's order, each new group in the shortest column, and
 * keeps the layout inside each group as it is.
 *
 * It applies when every node is in a group and no group holds another. Returns the new top-left position of every node,
 * groups included, best first, or none when packing does not make the diagram open at least 15% larger or the view
 * already reads well.
 */
export function packGroups(
  boxes: readonly Box[],
  frame: WrapFrame = DEFAULT_WRAP_FRAME,
): Array<Map<NodeId, { x: number; y: number }>> {
  const groups = boxes.filter(box => box.children.length > 0)
  const leaves = boxes.filter(box => box.children.length === 0)
  const nested = groups.some(group => group.parent !== null)
  if (groups.length < 2 || nested || leaves.some(leaf => leaf.parent === null)) {
    return []
  }
  const extent = (items: ReadonlyArray<Pick<Box, 'x' | 'y' | 'width' | 'height'>>) => {
    const x = Math.min(...items.map(b => b.x))
    const y = Math.min(...items.map(b => b.y))
    return {
      x,
      y,
      width: Math.max(...items.map(b => b.x + b.width)) - x,
      height: Math.max(...items.map(b => b.y + b.height)) - y,
    }
  }
  const whole = extent(boxes)
  const original = frameZoom(whole.width, whole.height, frame)
  if (original >= READABLE_ZOOM) {
    return []
  }
  // Graphviz's order: top to bottom, then left to right.
  const ordered = [...groups].sort((a, b) => a.y - b.y || a.x - b.x)
  const members = (group: Box) => boxes.filter(box => box.parent === group.id)

  const place = (columns: number) => {
    const heights = Array.from({ length: columns }, () => 0)
    const widths = Array.from({ length: columns }, () => 0)
    const assigned = ordered.map(group => {
      const column = heights.indexOf(Math.min(...heights))
      const top = heights[column]!
      heights[column] = top + group.height + GROUP_GAP
      widths[column] = Math.max(widths[column]!, group.width)
      return { group, column, top }
    })
    const lefts = widths.map((_, i) => widths.slice(0, i).reduce((sum, w) => sum + w + GROUP_GAP, 0))
    const result = new Map<NodeId, { x: number; y: number }>()
    for (const { group, column, top } of assigned) {
      const dx = lefts[column]! - group.x
      const dy = top - group.y
      for (const box of [group, ...members(group)]) {
        result.set(box.id, { x: box.x + dx, y: box.y + dy })
      }
    }
    const placed = extent(boxes.map(box => ({ ...box, ...result.get(box.id)! })))
    return { result, zoom: frameZoom(placed.width, placed.height, frame) }
  }

  return Array.from({ length: groups.length - 1 }, (_, i) => place(i + 2))
    .filter(candidate => candidate.zoom >= original * MIN_GAIN)
    .sort((a, b) => b.zoom - a.zoom)
    .slice(0, 3)
    .map(candidate => candidate.result)
}
