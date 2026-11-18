import type { DiagramEdge, DiagramNode } from '@likec4/core'

/** How cluttered a layout is: edge labels that cover each other, and edges drawn across nodes they do not join. */
export interface LayoutQuality {
  labelOverlaps: number
  edgesOverNodes: number
}

type Rect = { x: number; y: number; width: number; height: number }

const intersects = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

/** Points along an edge's cubic Bézier segments, eight steps each. */
function along(points: DiagramEdge['points']): Array<[number, number]> {
  const out: Array<[number, number]> = []
  for (let i = 0; i + 3 < points.length; i += 3) {
    const [p0, p1, p2, p3] = [points[i]!, points[i + 1]!, points[i + 2]!, points[i + 3]!]
    for (let step = 0; step <= 8; step++) {
      const t = step / 8
      const u = 1 - t
      out.push([
        u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
        u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1],
      ])
    }
  }
  return out
}

/** Counts what clutters a layout, to compare two layouts of the same view. */
export function layoutQuality(
  nodes: ReadonlyArray<Pick<DiagramNode, 'id' | 'x' | 'y' | 'width' | 'height' | 'children'>>,
  edges: ReadonlyArray<Pick<DiagramEdge, 'source' | 'target' | 'points' | 'labelBBox'>>,
): LayoutQuality {
  const labels = edges.flatMap(edge => (edge.labelBBox ? [edge.labelBBox] : []))
  let labelOverlaps = 0
  labels.forEach((label, i) => {
    labelOverlaps += labels.slice(i + 1).filter(other => intersects(label, other)).length
  })
  const leaves = nodes.filter(node => node.children.length === 0)
  let edgesOverNodes = 0
  for (const edge of edges) {
    const points = along(edge.points)
    for (const node of leaves) {
      if (node.id === edge.source || node.id === edge.target) {
        continue
      }
      // A small inset, so an edge that only grazes a node's border does not count.
      const crosses = points.some(([x, y]) =>
        node.x + 4 < x && x < node.x + node.width - 4 && node.y + 4 < y && y < node.y + node.height - 4
      )
      if (crosses) {
        edgesOverNodes++
      }
    }
  }
  return { labelOverlaps, edgesOverNodes }
}
