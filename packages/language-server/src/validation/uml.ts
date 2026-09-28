import { FqnRef, validateUmlModel } from '@likec4/core'
import { type ValidationCheck, AstUtils } from 'langium'
import { ast } from '../ast'
import { parseUmlClassifier, parseUmlExtensions, parseUmlRelationship } from '../model/parser/uml'
import type { LikeC4Services } from '../module'
import { projectIdFrom } from '../utils'

const common = 'description stereotype constraint'
const typed = 'type multiplicity default readOnly ordered unique'
const allowed: Record<string, string> = {
  classifier: `${common} kind abstract attribute operation template binding literal compartment`,
  uml: `${common} id kind sourceEnd targetEnd`,
  umlModel: 'association associationClass generalizationSet annotation',
  attribute: `${common} ${typed} visibility static derived redefines subsets`,
  qualifier: `${common} ${typed} visibility`,
  operation: `${common} visibility static abstract constructor query parameter returns`,
  parameter: `${common} ${typed} direction`,
  returns: 'multiplicity default readOnly ordered unique stereotype constraint',
  template: `${common} bound defaultType`,
  binding: 'templateRef argument',
  argument: 'parameterRef type',
  compartment: `${common} entry`,
  entry: common,
  literal: common,
  sourceEnd:
    `${common} id role member visibility multiplicity navigability aggregation qualifier readOnly ordered unique`,
  targetEnd:
    `${common} id role member visibility multiplicity navigability aggregation qualifier readOnly ordered unique`,
  end:
    `${common} id element role member visibility multiplicity navigability aggregation qualifier readOnly ordered unique`,
  association: `${common} end`,
  associationClass: 'associationRef classifierRef',
  generalizationSet: `${common} relationship disjoint complete`,
  annotation: `${common} kind text target targetElement targetMember targetRelationship targetEndId`,
  target: 'targetElement targetMember targetRelationship targetEndId',
  type: '',
  bound: '',
  defaultType: '',
}
export const umlAllowedProperties = {
  context: allowed,
  all: new Set(Object.values(allowed).flatMap(s => s.split(' ')).concat(Object.keys(allowed))),
}
const repeatable = new Set([
  'stereotype',
  'constraint',
  'redefines',
  'subsets',
  'relationship',
  'targetElement',
  'targetRelationship',
])

export const checkUmlSyntax =
  (): ValidationCheck<ast.ClassifierProperty | ast.UmlRelationshipProperty | ast.UmlModelProperty> =>
  (
    node,
    accept,
  ) => {
    const check = (container: typeof node | ast.UmlNamedBlock | ast.UmlEndBlock | ast.UmlTypeProperty) => {
      const keys = new Set<string>()
      for (const property of container.props) {
        if (!allowed[container.key]?.split(' ').includes(property.key)) {
          accept('error', `${property.key} is not supported inside ${container.key}`, {
            node: property,
            property: 'key',
          })
        }
        if (!ast.isUmlNamedBlock(property) && !repeatable.has(property.key) && keys.has(property.key)) {
          accept('error', `Duplicate UML property: ${property.key}`, { node: property })
        }
        keys.add(property.key)
        if ('props' in property) check(property)
      }
    }
    check(node)
    try {
      if (ast.isClassifierProperty(node)) {
        const classifier = parseUmlClassifier(node)
        if (classifier?.kind !== 'enumeration' && node.props.some(p => p.key === 'literal')) {
          accept('error', 'Only enumerations can declare literals', { node })
        }
      } else if (ast.isUmlRelationshipProperty(node)) parseUmlRelationship(node)
      else parseUmlExtensions(node)
    } catch (error) {
      accept('error', error instanceof Error ? error.message : String(error), { node })
    }
  }

export const checkUmlModel = (services: LikeC4Services): ValidationCheck<ast.LikeC4Grammar> => (root, accept) => {
  const document = AstUtils.getDocument(root)
  const local = [...AstUtils.streamAllContents(root)]
  if (!local.some(n => ast.isClassifierProperty(n) || ast.isUmlRelationshipProperty(n) || ast.isUmlModelProperty(n))) {
    return
  }
  services.shared.workspace.IndexManager.registerProjectValidationDependency(document)
  const docs = services.shared.workspace.LangiumDocuments.projectDocuments(projectIdFrom(document)).toArray()
  const elements = Object.fromEntries(
    docs.flatMap(d => d.c4Elements ?? []).map(
      e => [e.id, { id: e.id, ...(e.classifier && { classifier: e.classifier }) }],
    ),
  )
  const relations = Object.fromEntries(
    docs.flatMap(d => d.c4Relations ?? [])
      .filter(r => FqnRef.isModelRef(r.source) && FqnRef.isModelRef(r.target))
      .map(
        r => [r.id, {
          source: { model: FqnRef.flatten(r.source) },
          target: { model: FqnRef.flatten(r.target) },
          ...(r.uml && { uml: r.uml }),
        }],
      ),
  )
  const extensions = docs.flatMap(d => d.c4Uml ?? [])
  const diagnostics = validateUmlModel({
    elements,
    relations,
    uml: {
      associations: extensions.flatMap(u => u.associations ?? []),
      associationClasses: extensions.flatMap(u => u.associationClasses ?? []),
      generalizationSets: extensions.flatMap(u => u.generalizationSets ?? []),
      annotations: extensions.flatMap(u => u.annotations ?? []),
    },
  })
  for (const diagnostic of diagnostics) {
    const target = diagnostic.target
    const node = local.find(n => {
      if ('element' in target) return ast.isElement(n) && services.likec4.FqnIndex.getFqn(n) === target.element
      if (ast.isUmlRelationshipProperty(n)) {
        return n.props.some(p => ast.isUmlStringProperty(p) && p.key === 'id' && p.value === target.relationship)
      }
      return ast.isUmlNamedBlock(n) && n.name === target.relationship
    })
    if (node) accept(diagnostic.severity, diagnostic.message, { node, code: diagnostic.code })
  }
}
