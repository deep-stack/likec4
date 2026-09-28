import { type ProjectId, FqnRef } from '@likec4/core'
import { type ValidationCheck, AstUtils, DocumentState, WorkspaceCache } from 'langium'
import { ast } from '../ast'
import type { LikeC4Services } from '../module'
import { projectIdFrom, safeCall } from '../utils'
import { tryOrLog } from './_shared'

export const checkDecisionBranch = (): ValidationCheck<ast.DecisionBranchProperty> => (branch, accept) => {
  const body = branch.$container
  if (!ast.isRelationBody(body) || !ast.isRelation(body.$container)) {
    accept('error', 'Branches are supported only on model relationships', { node: branch })
    return
  }
  if (!branch.value.trim()) {
    accept('error', 'Branch label must not be empty', { node: branch, property: 'value' })
  }
  if (body.props.filter(ast.isDecisionBranchProperty).indexOf(branch) > 0) {
    accept('error', 'Duplicate branch label', { node: branch })
  }
}

/** Branch metadata opts a connected model component into flowchart diagnostics. */
export const checkDecisionElement = (services: LikeC4Services): ValidationCheck<ast.Element> => {
  const cache = new WorkspaceCache<ProjectId, {
    outgoing: Map<string, ast.Relation[]>
    participants: Set<string>
    decisions: Set<string>
  }>(services.shared, DocumentState.Linked)

  return tryOrLog((element, accept) => {
    const document = AstUtils.getDocument(element)
    services.shared.workspace.IndexManager.registerProjectValidationDependency(document)
    const projectId = projectIdFrom(document)
    const graph = cache.get(projectId, () => {
      const outgoing = new Map<string, ast.Relation[]>()
      const adjacent = new Map<string, Set<string>>()
      const decisions = new Set<string>()
      for (const doc of services.shared.workspace.LangiumDocuments.projectDocuments(projectId)) {
        const parser = services.likec4.ModelParser.forDocument(doc)
        for (const node of AstUtils.streamAllContents(doc.parseResult.value)) {
          if (!ast.isRelation(node)) continue
          const source = safeCall(() => parser._resolveRelationSource(node))
          const target = safeCall(() => parser.parseFqnRef(node.target))
          if (!source || !target || !FqnRef.isModelRef(source) || !FqnRef.isModelRef(target)) continue
          const from = FqnRef.flatten(source), to = FqnRef.flatten(target)
          const relations = outgoing.get(from) ?? []
          relations.push(node)
          outgoing.set(from, relations)
          for (const [a, b] of [[from, to], [to, from]] as const) {
            const neighbors = adjacent.get(a) ?? new Set<string>()
            neighbors.add(b)
            adjacent.set(a, neighbors)
          }
          if (node.body?.props.some(ast.isDecisionBranchProperty)) decisions.add(from)
        }
      }
      const participants = new Set(decisions)
      for (const id of participants) {
        for (const neighbor of adjacent.get(id) ?? []) participants.add(neighbor)
      }
      return { outgoing, participants, decisions }
    })
    const id = services.likec4.FqnIndex.getFqn(element)
    if (!id) return
    const shape = element.body?.props.filter(ast.isElementStyleProperty).flatMap(p => p.props)
      .find(ast.isShapeProperty)?.value
      ?? element.kind.ref?.$container.props.filter(ast.isElementStyleProperty).flatMap(p => p.props)
        .find(ast.isShapeProperty)?.value
    if (shape !== 'diamond' && !graph.decisions.has(id)) return
    if (!graph.participants.has(id)) return
    const outgoing = graph.outgoing.get(id) ?? []
    const warn = (message: string) => accept('warning', message, { node: element, property: 'name' })
    if (outgoing.length === 0) warn('Decision has no outgoing paths')
    if (outgoing.length === 1) warn('Decision has only one outgoing path')
    const labels = new Set<string>()
    for (const relation of outgoing) {
      const label = relation.body?.props.find(ast.isDecisionBranchProperty)?.value.trim()
      if (!label) {
        warn('Missing branch label on an outgoing decision path')
      } else if (labels.has(label)) {
        warn(`Duplicate outgoing branch label: ${label}`)
      } else {
        labels.add(label)
      }
    }
  })
}
