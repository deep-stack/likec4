import type { DiagramEdge, DiagramNode } from '@likec4/core'

/**
 * How cluttered a layout is: edge labels that cover each other or a node, edges drawn across nodes they do not join,
 * edges that cross each other, and edges that pass through a group neither of their ends is in.
 */
export interface LayoutQuality {
  labelOverlaps: number
  labelsOverNodes: number
  edgesOverNodes: number
  edgeCrossings: number
  edgesThroughGroups: number
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
  nodes: ReadonlyArray<Pick<DiagramNode, 'id' | 'x' | 'y' | 'width' | 'height' | 'children' | 'parent'>>,
  edges: ReadonlyArray<Pick<DiagramEdge, 'source' | 'target' | 'points' | 'labelBBox'>>,
): LayoutQuality {
  const labels = edges.flatMap(edge => (edge.labelBBox ? [edge.labelBBox] : []))
  let labelOverlaps = 0
  labels.forEach((label, i) => {
    labelOverlaps += labels.slice(i + 1).filter(other => intersects(label, other)).length
  })
  const leaves = nodes.filter(node => node.children.length === 0)
  const labelsOverNodes = labels.filter(label => leaves.some(node => intersects(label, node))).length
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
  // Pairs of edges that cross each other; edges that share a node meet there, which is no crossing.
  const lines = edges.map(edge => along(edge.points))
  const turn = (p: [number, number], q: [number, number], r: [number, number]) =>
    (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
  const crosses = (a: Array<[number, number]>, b: Array<[number, number]>) =>
    a.slice(1).some((a2, i) => {
      const a1 = a[i]!
      return b.slice(1).some((b2, j) => {
        const b1 = b[j]!
        return turn(a1, a2, b1) * turn(a1, a2, b2) < 0 && turn(b1, b2, a1) * turn(b1, b2, a2) < 0
      })
    })
  let edgeCrossings = 0
  edges.forEach((edge, i) => {
    edges.slice(i + 1).forEach((other, k) => {
      const shared = [edge.source, edge.target].some(id => id === other.source || id === other.target)
      if (!shared && crosses(lines[i]!, lines[i + 1 + k]!)) {
        edgeCrossings++
      }
    })
  })
  const parents = new Map(nodes.map(node => [node.id, node.parent]))
  const ancestors = (id: string) => {
    const found = new Set<string>()
    for (let at = parents.get(id as DiagramNode['id']); at; at = parents.get(at)) {
      found.add(at)
    }
    return found
  }
  const groups = nodes.filter(node => node.children.length > 0)
  let edgesThroughGroups = 0
  edges.forEach((edge, i) => {
    const own = new Set([edge.source, edge.target, ...ancestors(edge.source), ...ancestors(edge.target)])
    for (const group of groups) {
      if (own.has(group.id)) {
        continue
      }
      const through = lines[i]!.some(([x, y]) =>
        group.x + 4 < x && x < group.x + group.width - 4 && group.y + 4 < y && y < group.y + group.height - 4
      )
      if (through) {
        edgesThroughGroups++
      }
    }
  })
  return { labelOverlaps, labelsOverNodes, edgesOverNodes, edgeCrossings, edgesThroughGroups }
}
