import type { Context } from './machine.setup'

/** Immediate neighbours only; composite and parallel references retain their identity. */
export function tableNeighbourhood(active: string, edges: readonly { id: string; source: string; target: string }[]) {
  const nodes = new Set([active])
  const related = new Set<string>()
  for (const edge of edges) {
    if (edge.source !== active && edge.target !== active) continue
    nodes.add(edge.source)
    nodes.add(edge.target)
    related.add(edge.id)
  }
  return { nodes, edges: related }
}

/** Pointer hover takes precedence; focus is scoped to the current view. */
export function activeTable(context: Context): string | null {
  if (context.activeWalkthrough || context.focusedNode) return null
  const hovered = context.xynodes.find(node =>
    !node.hidden && node.data.hovered && 'table' in node.data && node.data.table
  )
  if (hovered) return hovered.id
  const focus = context.tableFocusedNode
  return focus?.view === context.view.id && context.xynodes.some(node => node.id === focus.node && !node.hidden)
    ? focus.node :
    null
}
