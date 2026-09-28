import type {
  UmlAnnotation,
  UmlAssociation,
  UmlAssociationClass,
  UmlAssociationEnd,
  UmlAttribute,
  UmlBinaryRelationship,
  UmlClassifier,
  UmlCompartment,
  UmlGeneralizationSet,
  UmlModelExtensions,
  UmlNamed,
  UmlOperation,
  UmlParameter,
  UmlProperties,
  UmlRelationshipEnd,
  UmlTemplateBinding,
  UmlTemplateParameter,
  UmlType,
  UmlTyped,
} from '@likec4/core'
import { parseUmlMultiplicity } from '@likec4/core'
import { ast } from '../../ast'

type Props = readonly ast.UmlProperty[]
const strings = (props: Props, key: string): string[] =>
  props.filter(ast.isUmlStringProperty).filter(p => p.key === key).map(p => p.value)
const str = (props: Props, key: string) => strings(props, key)[0]
const blocks = (props: Props, key: string) => props.filter(ast.isUmlNamedBlock).filter(p => p.key === key)
const bool = (props: Props, key: string) => props.filter(ast.isUmlBooleanProperty).find(p => p.key === key)?.value
const en = (props: Props, key: string) => props.filter(ast.isUmlEnumProperty).find(p => p.key === key)?.value
function choice<const T extends string>(value: string | undefined, choices: readonly T[], fallback: T): T {
  if (value === undefined) return fallback
  const found = choices.find(v => v === value)
  if (found === undefined) throw new Error(`Invalid UML value ${value}; expected ${choices.join(', ')}`)
  return found
}
function optional<K extends string, V>(key: K, value: V | undefined): Partial<Record<K, V>> {
  return value === undefined ? {} : { [key]: value } as Record<K, V>
}
function properties(props: Props): UmlProperties {
  return {
    ...optional('readOnly', bool(props, 'readOnly')),
    ...optional('ordered', bool(props, 'ordered')),
    ...optional('unique', bool(props, 'unique')),
    ...(strings(props, 'stereotype').length && { stereotypes: strings(props, 'stereotype') }),
    ...(strings(props, 'constraint').length && { constraints: strings(props, 'constraint') }),
  }
}
function typeValue(node: ast.UmlTypeProperty): UmlType {
  if (node.value === undefined) throw new Error('Expected UML type')
  return node.isReference ? { classifier: node.value } : { external: node.value }
}
function typed(props: Props): UmlTyped {
  const type = props.filter(ast.isUmlTypeProperty).find(p => p.key === 'type')
  const multiplicity = str(props, 'multiplicity')
  return {
    ...properties(props),
    ...(type && { type: typeValue(type) }),
    ...optional('default', str(props, 'default')),
    ...(multiplicity !== undefined && { multiplicity: parseUmlMultiplicity(multiplicity) }),
  }
}
function named(node: ast.UmlNamedBlock): UmlNamed {
  return {
    id: node.name,
    name: node.title ?? node.name,
    ...properties(node.props),
    ...optional('description', str(node.props, 'description')),
  }
}
function attribute(node: ast.UmlNamedBlock): UmlAttribute {
  return {
    ...named(node),
    ...typed(node.props),
    ...(en(node.props, 'visibility') &&
      { visibility: choice(en(node.props, 'visibility'), ['public', 'private', 'protected', 'package'], 'public') }),
    ...optional('static', bool(node.props, 'static')),
    ...optional('derived', bool(node.props, 'derived')),
    ...(strings(node.props, 'redefines').length && { redefines: strings(node.props, 'redefines') }),
    ...(strings(node.props, 'subsets').length && { subsets: strings(node.props, 'subsets') }),
  }
}
function parameter(node: ast.UmlNamedBlock): UmlParameter {
  return {
    ...named(node),
    ...typed(node.props),
    ...(en(node.props, 'direction') &&
      { direction: choice(en(node.props, 'direction'), ['in', 'out', 'inout', 'return'], 'in') }),
  }
}
function operation(node: ast.UmlNamedBlock): UmlOperation {
  const returns = node.props.filter(ast.isUmlTypeProperty).find(p => p.key === 'returns')
  return {
    ...named(node),
    ...(en(node.props, 'visibility') &&
      { visibility: choice(en(node.props, 'visibility'), ['public', 'private', 'protected', 'package'], 'public') }),
    ...optional('static', bool(node.props, 'static')),
    ...optional('abstract', bool(node.props, 'abstract')),
    ...optional('isConstructor', bool(node.props, 'constructor')),
    ...optional('query', bool(node.props, 'query')),
    ...(blocks(node.props, 'parameter').length && { parameters: blocks(node.props, 'parameter').map(parameter) }),
    ...(returns &&
      { returns: { ...(returns.value !== undefined && { type: typeValue(returns) }), ...typed(returns.props) } }),
  }
}
function template(node: ast.UmlNamedBlock): UmlTemplateParameter {
  const bound = node.props.filter(ast.isUmlTypeProperty).find(p => p.key === 'bound')
  const defaultType = node.props.filter(ast.isUmlTypeProperty).find(p => p.key === 'defaultType')
  return {
    ...named(node),
    ...(bound && { bound: typeValue(bound) }),
    ...(defaultType && { defaultType: typeValue(defaultType) }),
  }
}
function binding(node: ast.UmlNamedBlock): UmlTemplateBinding {
  return {
    template: str(node.props, 'templateRef') ?? node.name,
    arguments: blocks(node.props, 'argument').map(a => {
      const type = a.props.find(ast.isUmlTypeProperty)
      if (!type) throw new Error('Template arguments require a type')
      return { parameter: str(a.props, 'parameterRef') ?? a.name, type: typeValue(type) }
    }),
  }
}
function compartment(node: ast.UmlNamedBlock): UmlCompartment {
  return { ...named(node), entries: blocks(node.props, 'entry').map(named) }
}
export function parseUmlClassifier(node: ast.ClassifierProperty | undefined): UmlClassifier | undefined {
  if (!node) return undefined
  const props = node.props
  const kind = choice(
    en(props, 'kind'),
    ['class', 'interface', 'enumeration', 'dataType', 'primitiveType', 'package'],
    'class',
  )
  const common = {
    ...properties(props),
    ...optional('abstract', bool(props, 'abstract')),
    ...(blocks(props, 'attribute').length && { attributes: blocks(props, 'attribute').map(attribute) }),
    ...(blocks(props, 'operation').length && { operations: blocks(props, 'operation').map(operation) }),
    ...(blocks(props, 'template').length && { templates: blocks(props, 'template').map(template) }),
    ...(blocks(props, 'binding').length && { bindings: blocks(props, 'binding').map(binding) }),
    ...(blocks(props, 'compartment').length && { compartments: blocks(props, 'compartment').map(compartment) }),
  }
  return kind === 'enumeration'
    ? { ...common, kind, ...(blocks(props, 'literal').length && { literals: blocks(props, 'literal').map(named) }) }
    : { ...common, kind }
}
function end(props: Props, defaultId: string): UmlRelationshipEnd {
  return {
    id: str(props, 'id') ?? defaultId,
    ...properties(props),
    ...optional('role', str(props, 'role')),
    ...optional('member', str(props, 'member')),
    ...(str(props, 'multiplicity') !== undefined &&
      { multiplicity: parseUmlMultiplicity(str(props, 'multiplicity')!) }),
    ...(en(props, 'visibility') &&
      { visibility: choice(en(props, 'visibility'), ['public', 'private', 'protected', 'package'], 'public') }),
    ...(en(props, 'navigability') &&
      { navigability: choice(en(props, 'navigability'), ['unspecified', 'navigable', 'nonNavigable'], 'unspecified') }),
    ...(en(props, 'aggregation') &&
      { aggregation: choice(en(props, 'aggregation'), ['none', 'shared', 'composite'], 'none') }),
    ...(blocks(props, 'qualifier').length && { qualifiers: blocks(props, 'qualifier').map(attribute) }),
  }
}
export function parseUmlRelationship(node: ast.UmlRelationshipProperty | undefined): UmlBinaryRelationship | undefined {
  if (!node) return undefined
  const source = node.props.filter(ast.isUmlEndBlock).find(p => p.key === 'sourceEnd')
  const target = node.props.filter(ast.isUmlEndBlock).find(p => p.key === 'targetEnd')
  const id = str(node.props, 'id')
  if (!id) throw new Error('UML relationships require an explicit id')
  return {
    id,
    kind: choice(en(node.props, 'kind'), ['association', 'generalization', 'realization', 'dependency'], 'association'),
    source: end(source?.props ?? [], 'source'),
    target: end(target?.props ?? [], 'target'),
    ...properties(node.props),
  }
}
export function parseUmlExtensions(node: ast.UmlModelProperty): UmlModelExtensions {
  return {
    associations: blocks(node.props, 'association').map((a): UmlAssociation => ({
      ...named(a),
      ends: blocks(a.props, 'end').map((e): UmlAssociationEnd => ({
        ...end(e.props, e.name),
        element: str(e.props, 'element') ?? '',
      })),
    })),
    associationClasses: blocks(node.props, 'associationClass').map((a): UmlAssociationClass => ({
      id: a.name,
      classifier: str(a.props, 'classifierRef') ?? '',
      association: str(a.props, 'associationRef') ?? '',
    })),
    generalizationSets: blocks(node.props, 'generalizationSet').map((a): UmlGeneralizationSet => ({
      ...named(a),
      relationships: strings(a.props, 'relationship'),
      ...optional('disjoint', bool(a.props, 'disjoint')),
      ...optional('complete', bool(a.props, 'complete')),
    })),
    annotations: blocks(node.props, 'annotation').map((a): UmlAnnotation => ({
      ...named(a),
      kind: choice(en(a.props, 'kind'), ['note', 'comment', 'constraint'], 'note'),
      text: str(a.props, 'text') ?? '',
      targets: [
        ...blocks(a.props, 'target').flatMap(t => [
          ...strings(t.props, 'targetElement').map(element => ({
            element,
            ...optional('member', str(t.props, 'targetMember')),
          })),
          ...strings(t.props, 'targetRelationship').map(relationship => ({
            relationship,
            ...optional('end', str(t.props, 'targetEndId')),
          })),
        ]),
        ...strings(a.props, 'targetElement').map(element => ({
          element,
          ...optional('member', str(a.props, 'targetMember')),
        })),
        ...strings(a.props, 'targetRelationship').map(relationship => ({
          relationship,
          ...optional('end', str(a.props, 'targetEndId')),
        })),
      ],
    })),
  }
}
