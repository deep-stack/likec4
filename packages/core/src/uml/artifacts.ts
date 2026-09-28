import type { AnyAux, ComputedEdge, ComputedNode, EdgeId, NodeId, UmlModelExtensions, UmlOrigin } from '../types'
import { umlScopedId } from './identity'
import { umlRelationshipPresentation, umlSections } from './presentation'

/** Expand semantic UML records into view-only nodes without creating model elements. */
export function addUmlArtifacts<A extends AnyAux>(
  nodes: Map<NodeId, ComputedNode<A>>,
  edges: ComputedEdge<A>[],
  extensions: UmlModelExtensions | undefined,
): void {
  if (!extensions) return
  const id = (origin: UmlOrigin, suffix = '') => `@uml:${umlScopedId(origin.kind, origin.id)}:${suffix}`
  const node = (origin: UmlOrigin, title: string, artifact: 'junction' | 'anchor' | 'note') => {
    const nodeId = id(origin) as NodeId
    nodes.set(nodeId, {
      id: nodeId,
      kind: '@uml',
      title,
      umlOrigin: origin,
      umlArtifact: artifact,
      parent: null,
      children: [],
      inEdges: [],
      outEdges: [],
      color: 'gray',
      shape: 'rectangle',
      style: {},
      level: 0,
      tags: [],
    })
    return nodeId
  }
  const link = (origin: UmlOrigin, source: NodeId, target: NodeId, suffix: string) => {
    const edge: ComputedEdge<A> = {
      id: id(origin, suffix) as EdgeId,
      source,
      target,
      parent: null,
      label: null,
      color: 'gray',
      line: 'dashed',
      head: 'none',
      tail: 'none',
      relations: [],
      umlOrigin: origin,
    }
    edges.push(edge)
    return edge
  }
  const associationNodes = new Map<string, NodeId>()
  for (const association of extensions.associations ?? []) {
    if (!association.ends.every(end => nodes.has(end.element as NodeId))) continue
    const origin = { kind: 'association', id: association.id } as const
    const junction = node(origin, association.name, 'junction')
    associationNodes.set(association.id, junction)
    for (const end of association.ends) {
      const leg = link({ ...origin, end: end.id }, junction, end.element as NodeId, end.id)
      leg.uml = { id: association.id, kind: 'association', source: { id: 'junction' }, target: end }
      Object.assign(leg, umlRelationshipPresentation(leg.uml))
    }
  }
  // Splitting a displayed association at a stable anchor preserves both end semantics
  // and gives association classes / relationship annotations a real attachment point.
  const anchors = new Map<string, NodeId>(associationNodes)
  const anchor = (relationship: string): NodeId | undefined => {
    if (anchors.has(relationship)) return anchors.get(relationship)
    const edge = edges.find(e => e.uml?.id === relationship && !e.umlOrigin)
    if (!edge) return undefined
    const origin = { kind: 'association', id: relationship } as const
    const midpoint = node(origin, '', 'anchor')
    anchors.set(relationship, midpoint)
    const target = edge.target
    const original = edge.uml!
    edge.target = midpoint
    edge.umlOrigin = origin
    edge.uml = { ...original, target: { id: 'anchor' } }
    edge.head = 'none'
    const second = link(origin, midpoint, target, 'continuation')
    Object.assign(second, {
      color: edge.color,
      line: edge.line,
      head: umlRelationshipPresentation(original).head,
      uml: { ...original, source: { id: 'anchor' } },
    })
    return midpoint
  }
  for (const associationClass of extensions.associationClasses ?? []) {
    if (!nodes.has(associationClass.classifier as NodeId)) continue
    const attached = anchor(associationClass.association)
    if (attached) {
      link(
        { kind: 'associationClass', id: associationClass.id },
        attached,
        associationClass.classifier as NodeId,
        'class',
      )
    }
  }
  for (const annotation of extensions.annotations ?? []) {
    const targets = annotation.targets.flatMap(target => {
      let found: NodeId | undefined
      if ('element' in target) {
        const targetNode = nodes.get(target.element as NodeId)
        const visible = !target.member ||
          (targetNode?.classifier &&
            umlSections(targetNode.classifier, targetNode.umlPresentation).some(c =>
              c.rows.some(r => r.id === target.member)
            ))
        found = targetNode && visible ? targetNode.id : undefined
      }
      else if (target.end) {
        const relationship = edges.find(e =>
          e.uml?.id === target.relationship && (e.uml.source.id === target.end || e.uml.target.id === target.end)
        )
        found = relationship
          ? relationship.uml?.source.id === target.end ? relationship.source : relationship.target
          : undefined
      } else found = anchor(target.relationship)
      return found ? [{ id: found, ...('element' in target && target.member && { member: target.member }) }] : []
    })
    if (!targets.length) continue
    const origin = { kind: 'annotation', id: annotation.id } as const
    const note = node(origin, annotation.kind === 'constraint' ? `{${annotation.text}}` : annotation.text, 'note')
    targets.forEach((target, i) => {
      const edge = link(origin, note, target.id, String(i))
      if (target.member) edge.umlAttachment = { targetMember: target.member }
    })
  }
  for (const set of extensions.generalizationSets ?? []) {
    const targets = set.relationships.map(anchor).filter((target): target is NodeId => !!target)
    if (!targets.length) continue
    const origin = { kind: 'generalizationSet', id: set.id } as const
    const qualifiers = [
      set.disjoint === undefined ? null : set.disjoint ? 'disjoint' : 'overlapping',
      set.complete === undefined ? null : set.complete ? 'complete' : 'incomplete',
    ].filter(Boolean)
    const note = node(origin, `${set.name}${qualifiers.length ? ` {${qualifiers.join(', ')}}` : ''}`, 'note')
    targets.forEach((target, i) => link(origin, note, target, String(i)))
  }
}
