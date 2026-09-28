import type { DiagramEdge } from '../types'

/** Match a saved route after generated edge ids change. */
export function matchEdgeWithoutId(saved: DiagramEdge, latest: DiagramEdge): boolean {
  return !saved.tableRelation
    && !latest.tableRelation
    && saved.source === latest.source
    && saved.target === latest.target
    && saved.decisionBranch?.label === latest.decisionBranch?.label
}
