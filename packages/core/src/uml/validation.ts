import type {
  Element,
  Relationship,
  UmlClassifier,
  UmlDiagnostic,
  UmlModelExtensions,
  UmlNamed,
  UmlRelationshipEnd,
  UmlTarget,
  UmlType,
  UmlTyped,
} from '../types'
import { FqnRef } from '../types'
import { formatUmlMultiplicity } from './identity'

/** Shared semantic checks for DSL, Builder and serialized model consumers. */
export function validateUmlModel(model: {
  readonly elements: Readonly<Record<string, Pick<Element, 'id' | 'classifier'>>>
  readonly relations: Readonly<Record<string, Pick<Relationship, 'source' | 'target' | 'uml'>>>
  readonly uml?: UmlModelExtensions
}): readonly UmlDiagnostic[] {
  const diagnostics: UmlDiagnostic[] = []
  const classifiers = new Map<string, UmlClassifier>()
  for (const element of Object.values(model.elements)) {
    if (element.classifier) classifiers.set(element.id, element.classifier)
  }
  const report = (code: string, message: string, target: UmlTarget) => {
    diagnostics.push({ severity: 'error', code: `uml.${code}`, message, target })
  }
  const ids = (items: readonly { readonly id: string }[], target: UmlTarget) => {
    const seen = new Set<string>()
    for (const item of items) {
      if (!item.id.trim()) report('empty-id', 'UML identifiers must not be empty', target)
      if (seen.has(item.id)) report('duplicate-id', `Duplicate UML identifier: ${item.id}`, target)
      seen.add(item.id)
    }
  }
  const type = (value: UmlType | undefined, target: UmlTarget) => {
    if (value && 'classifier' in value && !classifiers.has(value.classifier)) {
      report('unknown-classifier', `Unknown classifier: ${value.classifier}`, target)
    }
    if (value && 'external' in value && !value.external.trim()) {
      report('empty-type', 'External type must not be empty', target)
    }
  }
  const typed = (value: UmlTyped, target: UmlTarget) => {
    type(value.type, target)
    if (value.multiplicity) {
      try {
        formatUmlMultiplicity(value.multiplicity)
      } catch {
        report('invalid-multiplicity', 'Invalid UML multiplicity bounds', target)
      }
    }
  }
  const members = (classifier: UmlClassifier): readonly UmlNamed[] => [
    ...classifier.attributes ?? [],
    ...classifier.operations ?? [],
    ...classifier.literals ?? [],
    ...classifier.templates ?? [],
    ...classifier.compartments?.flatMap(c => c.entries) ?? [],
  ]
  const inheritedMember = (element: string, member: string, visited = new Set<string>()): boolean => {
    if (visited.has(element)) return false
    visited.add(element)
    const classifier = classifiers.get(element)
    if (classifier && members(classifier).some(m => m.id === member)) return true
    return Object.values(model.relations).some(r =>
      r.uml?.kind === 'generalization' && FqnRef.flatten(r.source) === element &&
      inheritedMember(FqnRef.flatten(r.target), member, visited)
    )
  }
  const elementTarget = (element: string, member: string | undefined, target: UmlTarget) => {
    const classifier = classifiers.get(element)
    if (!classifier) report('unknown-classifier', `Unknown classifier: ${element}`, target)
    else if (member && !inheritedMember(element, member)) {
      report('unknown-member', `Unknown member: ${element}.${member}`, target)
    }
  }
  for (const [element, classifier] of classifiers) {
    const target = { element }
    ids(members(classifier), target)
    ids(classifier.compartments ?? [], target)
    if (
      (classifier.kind === 'primitiveType' || classifier.kind === 'package')
      && ((classifier.attributes?.length ?? 0) + (classifier.operations?.length ?? 0) > 0)
    ) {
      report('incompatible-members', `${classifier.kind} cannot declare attributes or operations`, target)
    }
    for (const attribute of classifier.attributes ?? []) {
      typed(attribute, { element, member: attribute.id })
      for (const ref of [...attribute.redefines ?? [], ...attribute.subsets ?? []]) {
        const dot = ref.lastIndexOf('.')
        elementTarget(dot < 0 ? element : ref.slice(0, dot), dot < 0 ? ref : ref.slice(dot + 1), target)
      }
    }
    const signatures = new Set<string>()
    for (const operation of classifier.operations ?? []) {
      const target = { element, member: operation.id }
      if (operation.abstract && (operation.static || operation.isConstructor)) {
        report('incompatible-modifiers', 'An abstract operation cannot be static or a constructor', target)
      }
      if (operation.abstract && classifier.kind === 'class' && !classifier.abstract) {
        report('incompatible-modifiers', 'An abstract operation requires an abstract class', target)
      }
      ids(operation.parameters ?? [], target)
      for (const parameter of operation.parameters ?? []) typed(parameter, target)
      if (operation.returns) typed(operation.returns, target)
      const returns = operation.parameters?.filter(p => p.direction === 'return') ?? []
      if (returns.length > 1 || (returns.length && operation.returns)) {
        report('duplicate-return', 'Specify one return parameter or one returns definition', target)
      }
      const parameters = operation.parameters ?? []
      if (parameters.every(p => p.type)) {
        const signature = JSON.stringify([operation.name, parameters.map(p => [p.direction ?? 'in', p.type])])
        if (signatures.has(signature)) {
          report('duplicate-signature', `Duplicate operation signature: ${operation.name}`, target)
        }
        signatures.add(signature)
      }
    }
    for (const parameter of classifier.templates ?? []) {
      type(parameter.bound, target)
      type(parameter.defaultType, target)
    }
    for (const binding of classifier.bindings ?? []) {
      const template = classifiers.get(binding.template)
      if (!template) report('unknown-classifier', `Unknown template: ${binding.template}`, target)
      const seen = new Set<string>()
      for (const argument of binding.arguments) {
        if (seen.has(argument.parameter)) {
          report('duplicate-binding', `Duplicate template argument: ${argument.parameter}`, target)
        }
        seen.add(argument.parameter)
        if (template && !template.templates?.some(p => p.id === argument.parameter)) {
          report('unknown-parameter', `Unknown template parameter: ${argument.parameter}`, target)
        }
        type(argument.type, target)
      }
      for (const parameter of template?.templates ?? []) {
        if (!seen.has(parameter.id) && !parameter.defaultType) {
          report('missing-binding', `Missing template argument: ${parameter.id}`, target)
        }
      }
    }
  }
  const relations = new Map(Object.values(model.relations).flatMap(r => r.uml ? [[r.uml.id, r] as const] : []))
  const associations = new Map((model.uml?.associations ?? []).map(a => [a.id, a]))
  const globalItems = [
    ...Object.values(model.relations).flatMap(r => r.uml ? [r.uml] : []),
    ...model.uml?.associations ?? [],
    ...model.uml?.associationClasses ?? [],
    ...model.uml?.generalizationSets ?? [],
    ...model.uml?.annotations ?? [],
  ]
  const globalIds = new Set<string>()
  for (const item of globalItems) {
    if (!item.id.trim()) report('empty-id', 'UML identifiers must not be empty', { relationship: item.id })
    if (globalIds.has(item.id)) {
      report('duplicate-id', `Duplicate UML identifier: ${item.id}`, { relationship: item.id })
    }
    globalIds.add(item.id)
  }
  const end = (value: UmlRelationshipEnd, element: string, relationship: string) => {
    const target = { relationship, end: value.id }
    elementTarget(element, value.member, target)
    typed(value, target)
    ids(value.qualifiers ?? [], target)
    for (const qualifier of value.qualifiers ?? []) typed(qualifier, target)
  }
  const generalizations = new Map<string, string[]>()
  for (const [id, relation] of relations) {
    const uml = relation.uml!
    const source = FqnRef.flatten(relation.source), target = FqnRef.flatten(relation.target)
    end(uml.source, source, id)
    end(uml.target, target, id)
    ids([uml.source, uml.target], { relationship: id })
    const aggregated = [uml.source, uml.target].filter(e => e.aggregation && e.aggregation !== 'none')
    if (aggregated.length > 1 || (aggregated.length && uml.kind !== 'association')) {
      report('invalid-aggregation', 'Only one end of an association may aggregate', { relationship: id })
    }
    if (
      uml.kind !== 'association' && [uml.source, uml.target].some(e => e.qualifiers?.length || e.multiplicity || e.role)
    ) {
      report('invalid-end-properties', 'Roles, qualifiers and multiplicities require an association', {
        relationship: id,
      })
    }
    if (uml.kind === 'realization' && classifiers.get(target)?.kind !== 'interface') {
      report('invalid-realization', 'A classifier realization must target an interface', { relationship: id })
    }
    if (uml.kind === 'generalization') {
      if (classifiers.get(source)?.kind !== classifiers.get(target)?.kind) {
        report('invalid-generalization', 'Generalization requires compatible classifier kinds', { relationship: id })
      }
      generalizations.set(source, [...generalizations.get(source) ?? [], target])
    }
  }
  for (const start of generalizations.keys()) {
    const pending = [...generalizations.get(start) ?? []], visited = new Set<string>()
    while (pending.length) {
      const next = pending.pop()!
      if (next === start) {
        report('inheritance-cycle', 'Generalization must not form a cycle', { element: start })
        break
      }
      if (visited.has(next)) continue
      visited.add(next)
      pending.push(...generalizations.get(next) ?? [])
    }
  }
  for (const association of associations.values()) {
    const target = { relationship: association.id }
    if (association.ends.length < 3) {
      report('invalid-arity', 'An n-ary association requires at least three ends', target)
    }
    ids(association.ends, target)
    for (const value of association.ends) {
      end(value, value.element, association.id)
      if (value.aggregation && value.aggregation !== 'none') {
        report('invalid-aggregation', 'Aggregation requires a binary association', target)
      }
    }
  }
  const isAssociation = (id: string) => associations.has(id) || relations.get(id)?.uml?.kind === 'association'
  for (const attachment of model.uml?.associationClasses ?? []) {
    const target = { relationship: attachment.id }
    if (!isAssociation(attachment.association)) {
      report('unknown-association', `Unknown association: ${attachment.association}`, target)
    }
    if (classifiers.get(attachment.classifier)?.kind !== 'class') {
      report('invalid-association-class', 'An association class requires a class', target)
    }
  }
  for (const set of model.uml?.generalizationSets ?? []) {
    const target = { relationship: set.id }
    if (!set.relationships.length) {
      report('empty-generalization-set', 'A generalization set requires generalizations', target)
    }
    const parents = new Set<string>()
    for (const id of set.relationships) {
      const relation = relations.get(id)
      if (relation?.uml?.kind !== 'generalization') {
        report('invalid-generalization-set', `Not a generalization: ${id}`, target)
      }
      else parents.add(FqnRef.flatten(relation.target))
    }
    if (parents.size > 1) {
      report('invalid-generalization-set', 'Set members must share the same general classifier', target)
    }
  }
  for (const annotation of model.uml?.annotations ?? []) {
    const location = { relationship: annotation.id }
    for (const target of annotation.targets) {
      if ('element' in target) elementTarget(target.element, target.member, location)
      else {
        const relation = relations.get(target.relationship)?.uml
        const association = associations.get(target.relationship)
        if (!relation && !association) {
          report('unknown-relationship', `Unknown relationship: ${target.relationship}`, location)
        }
        else if (
          target.end &&
          !(association?.ends ?? (relation ? [relation.source, relation.target] : [])).some(e => e.id === target.end)
        ) {
          report('unknown-end', `Unknown association end: ${target.end}`, location)
        }
      }
    }
  }
  return diagnostics
}
