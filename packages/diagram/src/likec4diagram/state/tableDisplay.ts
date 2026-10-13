import type { TableDefinition } from '@likec4/core'
import { tableGeometry } from '@likec4/core/geometry'
import type { Types } from '../types'

/** Presentation only: the complete table definition is never changed. */
export function tablePreview(table: TableDefinition, title: string, required: ReadonlySet<string>, expanded: boolean) {
  const visible = new Set(table.fields.filter(f => f.keys?.includes('primary') || required.has(f.id)).map(f => f.id))
  for (const field of table.fields) {
    if (visible.size >= 8) break
    visible.add(field.id)
  }
  const fields = table.fields.filter(f => expanded || visible.has(f.id))
  const geometry = tableGeometry({ ...table, fields }, title)
  const hidden = table.fields.length - visible.size
  return { ...geometry, height: geometry.height + (hidden > 0 ? 36 : 0), fields, hidden }
}

export function requiredFields(id: string, edges: Types.Edge[]): Set<string> {
  return new Set(edges.flatMap(edge => {
    const relation = 'tableRelation' in edge.data ? edge.data.tableRelation : undefined
    return relation?.pairs.flatMap(pair => [
      ...(edge.source === id ? [pair.source] : []),
      ...(edge.target === id ? [pair.target] : []),
    ]) ?? []
  }))
}

/** Compact each sibling group from the original layout, so toggles never accumulate drift. */
export function tableDisplayLayout(
  base: Types.Node[],
  edges: Types.Edge[],
  expanded: Record<string, boolean>,
): Types.Node[] {
  const nodes = base.map(node => {
    if (!('table' in node.data) || !node.data.table) return { ...node, position: { ...node.position } }
    const geometry = tablePreview(node.data.table, node.data.title, requiredFields(node.id, edges), !!expanded[node.id])
    return {
      ...node,
      position: { ...node.position },
      height: geometry.height,
      measured: { ...node.measured, height: geometry.height },
      style: { ...node.style, height: geometry.height },
    }
  })
  function arrange(parentId: string | undefined) {
    const siblings = nodes.filter(n => n.parentId === parentId)
      .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x || a.id.localeCompare(b.id))
    const placed: Types.Node[] = []
    for (const node of siblings) {
      const children = arrange(node.id)
      if (children.length) {
        node.height = Math.max(...children.map(n => n.position.y + (n.height ?? n.measured?.height ?? 0))) + 40
        node.measured = { ...node.measured, height: node.height }
        node.style = { ...node.style, height: node.height }
      }
      const overlaps = placed.filter(n =>
        n.position.x < node.position.x + (node.width ?? node.measured?.width ?? 0) + 32
        && node.position.x < n.position.x + (n.width ?? n.measured?.width ?? 0) + 32
      )
      node.position.y = overlaps.length
        ? Math.max(...overlaps.map(n => n.position.y + (n.height ?? n.measured?.height ?? 0))) + 64
        : Math.min(node.position.y, parentId ? 60 : 40)
      placed.push(node)
    }
    return siblings
  }
  arrange(undefined)
  return nodes
}

export function absolutePosition(nodes: Types.Node[], id: string): { x: number; y: number } {
  const node = nodes.find(n => n.id === id)
  if (!node) return { x: 0, y: 0 }
  const parent = node.parentId ? absolutePosition(nodes, node.parentId) : { x: 0, y: 0 }
  return { x: node.position.x + parent.x, y: node.position.y + parent.y }
}

/** Orthogonal display route around leaf rectangles; field endpoints stay explicit. */
export function tableDisplayPath(
  nodes: Types.Node[],
  edges: Types.Edge[],
  expanded: Record<string, boolean>,
  source: string,
  target: string,
  sourceField: string,
  targetField: string,
): string | null {
  function endpoint(id: string, field: string, right: boolean) {
    const node = nodes.find(n => n.id === id)
    if (!node || !('table' in node.data) || !node.data.table) return null
    const geometry = tablePreview(node.data.table, node.data.title, requiredFields(id, edges), !!expanded[id])
    const row = geometry.rows.find(r => r.id === field)
    if (!row) return null
    const pos = absolutePosition(nodes, id)
    return {
      x: pos.x + (right ? node.width ?? node.measured?.width ?? node.initialWidth ?? geometry.width : 0),
      y: pos.y + row.y + row.height / 2,
    }
  }
  const start = endpoint(source, sourceField, true), end = endpoint(target, targetField, false)
  if (!start || !end) return null
  const boxes = nodes.filter(n => !nodes.some(child => child.parentId === n.id)).map(n => {
    const pos = absolutePosition(nodes, n.id)
    return {
      left: pos.x - 12,
      right: pos.x + (n.width ?? n.measured?.width ?? 0) + 12,
      top: pos.y - 12,
      bottom: pos.y + (n.height ?? n.measured?.height ?? 0) + 12,
    }
  })
  const from = { x: start.x + 20, y: start.y }, to = { x: end.x - 20, y: end.y }
  const xs = [...new Set([from.x, to.x, ...boxes.flatMap(b => [b.left, b.right])])].sort((a, b) => a - b)
  const ys = [...new Set([from.y, to.y, ...boxes.flatMap(b => [b.top, b.bottom])])].sort((a, b) => a - b)
  const key = (x: number, y: number) => y * xs.length + x
  const first = key(xs.indexOf(from.x), ys.indexOf(from.y)), last = key(xs.indexOf(to.x), ys.indexOf(to.y))
  const previous = new Map<number, number>([[first, -1]]), queue = [first]
  for (let i = 0; i < queue.length && !previous.has(last); i++) {
    const current = queue[i]!, x = current % xs.length, y = Math.floor(current / xs.length)
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx === undefined || ny === undefined || nx < 0 || ny < 0 || nx >= xs.length || ny >= ys.length) continue
      const next = key(nx, ny)
      if (previous.has(next)) continue
      const ax = xs[x]!, ay = ys[y]!, bx = xs[nx]!, by = ys[ny]!
      const blocked = boxes.some(b =>
        ax === bx
          ? ax > b.left && ax < b.right && Math.max(ay, by) > b.top && Math.min(ay, by) < b.bottom
          : ay > b.top && ay < b.bottom && Math.max(ax, bx) > b.left && Math.min(ax, bx) < b.right
      )
      if (!blocked) {
        previous.set(next, current)
        queue.push(next)
      }
    }
  }
  if (!previous.has(last)) return null
  const route = []
  for (let at = last; at !== -1; at = previous.get(at) ?? -1) {
    route.push({ x: xs[at % xs.length]!, y: ys[Math.floor(at / xs.length)]! })
  }
  return [start, ...route.reverse(), end].map((p, i) => `${i ? 'L' : 'M'} ${p.x},${p.y}`).join(' ')
}
