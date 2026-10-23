import type { TableDefinition } from '@likec4/core'
import { tableGeometry } from '@likec4/core/geometry'
import { ElementHoverScale } from '../../base/const'
import type { Types } from '../types'
import type { Context } from './machine.setup'

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

/**
 * The single expansion toggle of read-only diagrams: shown while previews hide fields of some table,
 * and expanded once every such table is.
 */
export function tableToggle(context: Pick<Context, 'xynodes' | 'xyedges' | 'view' | 'tablePreview'>) {
  const collapsible = context.xynodes.filter(node =>
    'table' in node.data && !!node.data.table &&
    tablePreview(node.data.table, node.data.title, requiredFields(node.id, context.xyedges), false).hidden > 0
  )
  return {
    visible: context.tablePreview?.view === context.view.id && collapsible.length > 0,
    expanded: collapsible.length > 0 && collapsible.every(node => !!context.tablePreview?.expanded[node.id]),
  }
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

/** Flowing cubic relationship with horizontal tangents at both field endpoints. */
export function tableDisplayPath(
  nodes: Types.Node[],
  edges: Types.Edge[],
  expanded: Record<string, boolean>,
  source: string,
  target: string,
  sourceField: string,
  targetField: string,
): string | null {
  function visualBox(node: Types.Node) {
    const pos = absolutePosition(nodes, node.id)
    const width = node.width ?? node.measured?.width ?? node.initialWidth
    const height = node.height ?? node.measured?.height ?? node.initialHeight
    const scale = node.data.hovered ? ElementHoverScale : 1
    return {
      x: pos.x - width * (scale - 1) / 2,
      y: pos.y - height * (scale - 1) / 2,
      width: width * scale,
      height: height * scale,
      scale,
    }
  }
  function endpoint(id: string, field: string, right: boolean) {
    const node = nodes.find(n => n.id === id)
    if (!node || !('table' in node.data) || !node.data.table) return null
    const geometry = tablePreview(node.data.table, node.data.title, requiredFields(id, edges), !!expanded[id])
    const row = geometry.rows.find(r => r.id === field)
    if (!row) return null
    const box = visualBox(node)
    return { x: box.x + (right ? box.width : 0), y: box.y + (row.y + row.height / 2) * box.scale }
  }
  const start = endpoint(source, sourceField, true), end = endpoint(target, targetField, source === target)
  if (!start || !end) return null
  if (source === target) {
    // Expanding a table increases the vertical span, not the loop width.
    // Keep the loop in the available gutter beside the table.
    const neighbours = nodes.filter(n => n.id !== source && !nodes.some(child => child.parentId === n.id))
      .map(visualBox)
      .filter(box =>
        box.x > start.x && box.y < Math.max(start.y, end.y)
        && box.y + box.height > Math.min(start.y, end.y)
      )
    const gap = Math.min(Infinity, ...neighbours.map(box => box.x - start.x))
    const reach = Math.min(80, Math.max(0, gap - 16))
    return `M ${start.x},${start.y} C ${start.x + reach},${start.y} ${end.x + reach},${end.y} ${end.x},${end.y}`
  }
  // Free-flowing field relationships: do not constrain the curve to table borders.
  const reach = Math.max(60, Math.abs(end.x - start.x) / 2, Math.abs(end.y - start.y) / 3)
  return `M ${start.x},${start.y} C ${start.x + reach},${start.y} ${end.x - reach},${end.y} ${end.x},${end.y}`
}
