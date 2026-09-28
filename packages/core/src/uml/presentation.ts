import type {
  RelationshipArrowType,
  UmlAttribute,
  UmlBinaryRelationship,
  UmlClassifier,
  UmlOperation,
  UmlPresentation,
  UmlProperties,
  UmlType,
  UmlTyped,
  UmlVisibility,
} from '../types'
import { formatUmlMultiplicity } from './identity'
export interface UmlRow {
  readonly id: string
  readonly text: string
  readonly static?: boolean
  readonly abstract?: boolean
}
export interface UmlSection {
  readonly id: string
  readonly title: string
  readonly rows: readonly UmlRow[]
}
export function umlTypeText(type: UmlType | undefined): string {
  return type ? ('external' in type ? type.external : type.classifier) : ''
}
function stereotypes(value: UmlProperties): string {
  return value.stereotypes?.length ? `«${value.stereotypes.join(', ')}» ` : ''
}
function properties(value: UmlProperties): string {
  const entries = [
    value.readOnly && 'readOnly',
    value.ordered && 'ordered',
    value.unique === false && 'nonunique',
    ...(value.constraints ?? []),
  ].filter(Boolean)
  return entries.length ? ` {${entries.join(', ')}}` : ''
}
function typed(value: UmlTyped): string {
  return `${value.type ? `: ${umlTypeText(value.type)}` : ''}${
    value.multiplicity ? ` [${formatUmlMultiplicity(value.multiplicity)}]` : ''
  }${value.default !== undefined ? ` = ${value.default}` : ''}${properties(value)}`
}
const visibility: Record<UmlVisibility, string> = { public: '+', private: '-', protected: '#', package: '~' }
export function umlAttributeText(value: UmlAttribute): string {
  return `${value.visibility ? `${visibility[value.visibility]} ` : ''}${stereotypes(value)}${
    value.derived ? '/' : ''
  }${value.name}${typed(value)}${value.subsets?.length ? ` {subsets ${value.subsets.join(', ')}}` : ''}${
    value.redefines?.length ? ` {redefines ${value.redefines.join(', ')}}` : ''
  }`
}
export function umlOperationText(value: UmlOperation): string {
  const parameters =
    value.parameters?.map(p => `${p.direction && p.direction !== 'in' ? `${p.direction} ` : ''}${p.name}${typed(p)}`)
      .join(', ') ?? ''
  return `${value.visibility ? `${visibility[value.visibility]} ` : ''}${stereotypes(value)}${
    value.isConstructor ? '«create» ' : ''
  }${value.name}(${parameters})${value.returns ? typed(value.returns) : ''}${value.query ? ' {query}' : ''}${
    properties(value)
  }`
}
export function umlSections(classifier: UmlClassifier, presentation: UmlPresentation = {}): readonly UmlSection[] {
  const visible = (m: { id: string; visibility?: UmlVisibility }) =>
    !presentation.hiddenMembers?.includes(m.id)
    && (!m.visibility || !presentation.visibility || presentation.visibility.includes(m.visibility))
  const sections: UmlSection[] = [
    {
      id: 'attributes',
      title: 'Attributes',
      rows: (classifier.attributes ?? []).filter(visible).map(a => ({
        id: a.id,
        text: umlAttributeText(a),
        ...(a.static && { static: true }),
      })),
    },
    {
      id: 'operations',
      title: 'Operations',
      rows: (classifier.operations ?? []).filter(visible).map(o => ({
        id: o.id,
        text: umlOperationText(o),
        ...(o.static && { static: true }),
        ...(o.abstract && { abstract: true }),
      })),
    },
    ...(classifier.kind === 'enumeration'
      ? [{
        id: 'literals',
        title: 'Literals',
        rows: (classifier.literals ?? []).filter(visible).map(l => ({ id: l.id, text: l.name })),
      }]
      : []),
    ...(classifier.compartments ?? []).map(c => ({
      id: c.id,
      title: c.name,
      rows: c.entries.filter(visible).map(e => ({ id: e.id, text: e.name })),
    })),
  ]
  return sections.filter(s =>
    !presentation.hiddenCompartments?.includes(s.id) &&
    !(['primitiveType', 'package'].includes(classifier.kind) && ['attributes', 'operations'].includes(s.id))
  )
}
export function umlClassifierHeading(title: string, classifier: UmlClassifier): string[] {
  const stereotypes = [...(classifier.kind === 'class' ? [] : [classifier.kind]), ...classifier.stereotypes ?? []]
  const parameters = classifier.templates?.map(t =>
    `${t.name}${t.bound ? `: ${umlTypeText(t.bound)}` : ''}${t.defaultType ? ` = ${umlTypeText(t.defaultType)}` : ''}`
  ).join(', ')
  return [
    ...(stereotypes.length ? [`«${stereotypes.join(', ')}»`] : []),
    `${title}${parameters ? `<${parameters}>` : ''}`,
    ...classifier.bindings?.map(b =>
      `«bind» ${b.template}<${b.arguments.map(a => `${a.parameter} → ${umlTypeText(a.type)}`).join(', ')}>`
    ) ?? [],
    ...classifier.constraints?.map(c => `{${c}}`) ?? [],
  ]
}
export function umlRelationshipPresentation(
  uml: UmlBinaryRelationship,
): { line: 'solid' | 'dashed'; head: RelationshipArrowType; tail: RelationshipArrowType } {
  const end = (e: UmlBinaryRelationship['source']): RelationshipArrowType =>
    e.aggregation === 'composite' ?
      'diamond'
      : e.aggregation === 'shared'
      ? 'odiamond'
      : e.navigability === 'navigable'
      ? 'open'
      : 'none'
  if (uml.kind === 'generalization') return { line: 'solid', head: 'onormal', tail: 'none' }
  if (uml.kind === 'realization') return { line: 'dashed', head: 'onormal', tail: 'none' }
  if (uml.kind === 'dependency') return { line: 'dashed', head: 'open', tail: 'none' }
  return { line: 'solid', head: end(uml.target), tail: end(uml.source) }
}

/** Text attached to an association end, shared by layout and canvas. */
export function umlEndText(end: UmlBinaryRelationship['source']): string[] {
  return [
    ...(end.role ? [`${end.visibility ? visibility[end.visibility] + ' ' : ''}${end.role}`] : []),
    ...(end.multiplicity ? [formatUmlMultiplicity(end.multiplicity)] : []),
    ...(end.qualifiers ?? []).map(q => `[${umlAttributeText(q)}]`),
    ...end.constraints?.map(c => `{${c}}`) ?? [],
  ]
}
