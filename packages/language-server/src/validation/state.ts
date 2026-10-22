import { type ProjectId, FqnRef } from '@likec4/core'
import { type ValidationCheck, AstUtils, DocumentState, WorkspaceCache } from 'langium'
import { ast } from '../ast'
import type { LikeC4Services } from '../module'
import { projectIdFrom, safeCall } from '../utils'
import { tryOrLog } from './_shared'

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

type Shape = 'initial' | 'final' | 'state'

function shapeOf(element: ast.Element): string | undefined {
  return element.body?.props.filter(ast.isElementStyleProperty).flatMap(p => p.props)
    .find(ast.isShapeProperty)?.value
    ?? element.kind.ref?.$container.props.filter(ast.isElementStyleProperty).flatMap(p => p.props)
      .find(ast.isShapeProperty)?.value
}

function transitionParts(relation: ast.Relation) {
  return relation.body?.props.find(ast.isStateTransitionProperty)?.parts.filter(part => part.value.trim()) ?? []
}

/** UML rules for initial and final states, and for transitions between states. They only warn. */
export const checkStateElement = (services: LikeC4Services): ValidationCheck<ast.Element> => {
  const cache = new WorkspaceCache<ProjectId, {
    shapes: Map<string, Shape>
    outgoing: Map<string, { relation: ast.Relation; target: string }[]>
    incoming: Map<string, number>
  }>(services.shared, DocumentState.Linked)

  return tryOrLog((element, accept) => {
    const shape = shapeOf(element)
    if (shape !== 'initial' && shape !== 'final' && shape !== 'state') return
    const document = AstUtils.getDocument(element)
    services.shared.workspace.IndexManager.registerProjectValidationDependency(document)
    const projectId = projectIdFrom(document)
    const graph = cache.get(projectId, () => {
      const shapes = new Map<string, Shape>()
      const outgoing = new Map<string, { relation: ast.Relation; target: string }[]>()
      const incoming = new Map<string, number>()
      for (const doc of services.shared.workspace.LangiumDocuments.projectDocuments(projectId)) {
        const parser = services.likec4.ModelParser.forDocument(doc)
        for (const node of AstUtils.streamAllContents(doc.parseResult.value)) {
          if (ast.isElement(node)) {
            const nodeShape = shapeOf(node)
            const fqn = services.likec4.FqnIndex.getFqn(node)
            if (fqn && (nodeShape === 'initial' || nodeShape === 'final' || nodeShape === 'state')) {
              shapes.set(fqn, nodeShape)
            }
            continue
          }
          if (!ast.isRelation(node)) continue
          const source = safeCall(() => parser._resolveRelationSource(node))
          const target = safeCall(() => parser.parseFqnRef(node.target))
          if (!source || !target || !FqnRef.isModelRef(source) || !FqnRef.isModelRef(target)) continue
          const from = FqnRef.flatten(source), to = FqnRef.flatten(target)
          outgoing.set(from, [...outgoing.get(from) ?? [], { relation: node, target: to }])
          incoming.set(to, (incoming.get(to) ?? 0) + 1)
        }
      }
      return { shapes, outgoing, incoming }
    })
    const id = services.likec4.FqnIndex.getFqn(element)
    if (!id) return
    const outgoing = graph.outgoing.get(id) ?? []
    const warn = (message: string) => accept('warning', message, { node: element, property: 'name' })
    switch (shape) {
      case 'initial': {
        if ((graph.incoming.get(id) ?? 0) > 0) warn('An initial state cannot have incoming transitions')
        if (outgoing.length !== 1) warn('An initial state has exactly one outgoing transition')
        if (outgoing.some(({ relation }) => transitionParts(relation).some(p => p.key !== 'effect'))) {
          warn('The transition from an initial state has no trigger or guard')
        }
        break
      }
      case 'final': {
        if (outgoing.length > 0) warn('A final state cannot have outgoing transitions')
        break
      }
      case 'state': {
        const unnamed = outgoing.some(({ relation, target }) =>
          graph.shapes.get(target) === 'state' && transitionParts(relation).length === 0 && !relation.title?.trim()
        )
        if (unnamed) warn('Name the trigger, guard or effect of this transition')
        break
      }
    }
  })
}
