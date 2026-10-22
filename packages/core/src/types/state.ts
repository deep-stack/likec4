/** What makes a state machine move from one state to another: `trigger [guard] / effect`, each part optional. */
export interface StateTransition {
  readonly trigger?: string
  readonly guard?: string
  readonly effect?: string
}

export type StateTransitionLabelPart = {
  readonly kind: 'trigger' | 'guard' | 'effect'
  readonly text: string
}

/** The parts of a transition's label, in UML order, without blank ones. */
export function stateTransitionLabelParts(transition: StateTransition): StateTransitionLabelPart[] {
  const parts: StateTransitionLabelPart[] = []
  const trigger = transition.trigger?.trim()
  const guard = transition.guard?.trim()
  const effect = transition.effect?.trim()
  if (trigger) parts.push({ kind: 'trigger', text: trigger })
  if (guard) parts.push({ kind: 'guard', text: `[${guard}]` })
  if (effect) parts.push({ kind: 'effect', text: `/ ${effect}` })
  return parts
}

/** A transition's label, `trigger [guard] / effect`, or null when it has no parts. */
export function stateTransitionLabel(transition: StateTransition): string | null {
  const parts = stateTransitionLabelParts(transition)
  return parts.length > 0 ? parts.map(part => part.text).join(' ') : null
}
