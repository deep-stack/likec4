import type { ValidationCheck } from 'langium'
import { ast } from '../ast'

export const checkStateTransition = (): ValidationCheck<ast.StateTransitionProperty> => (transition, accept) => {
  const body = transition.$container
  if (!ast.isRelationBody(body) || !ast.isRelation(body.$container)) {
    accept('error', 'Transitions are supported only on model relationships', { node: transition })
    return
  }
  if (body.props.filter(ast.isStateTransitionProperty).indexOf(transition) > 0) {
    accept('error', 'Duplicate transition block', { node: transition })
  }
  const seen = new Set<string>()
  for (const part of transition.parts) {
    if (seen.has(part.key)) {
      accept('error', `Duplicate transition ${part.key}`, { node: part })
    }
    seen.add(part.key)
  }
}
