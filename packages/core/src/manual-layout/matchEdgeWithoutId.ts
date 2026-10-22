import { type DiagramEdge, stateTransitionLabel } from '../types'

/** Match a saved route after generated edge ids change. */
export function matchEdgeWithoutId(saved: DiagramEdge, latest: DiagramEdge): boolean {
  return !saved.tableRelation
    && !latest.tableRelation
    && !saved.uml && !latest.uml
    && !saved.umlOrigin && !latest.umlOrigin
    && saved.source === latest.source
    && saved.target === latest.target
    && saved.decisionBranch?.label === latest.decisionBranch?.label
    && (saved.stateTransition ? stateTransitionLabel(saved.stateTransition) : null)
      === (latest.stateTransition ? stateTransitionLabel(latest.stateTransition) : null)
}
