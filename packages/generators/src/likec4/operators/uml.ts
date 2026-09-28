import type { UmlBinaryRelationship, UmlClassifier, UmlModelExtensions } from '@likec4/core'
import { formatUmlMultiplicity } from '@likec4/core'

const arrayBlocks: Record<string, string> = {
  attributes: 'attribute',
  operations: 'operation',
  parameters: 'parameter',
  templates: 'template',
  literals: 'literal',
  compartments: 'compartment',
  entries: 'entry',
  qualifiers: 'qualifier',
  bindings: 'binding',
  arguments: 'argument',
  associations: 'association',
  ends: 'end',
  associationClasses: 'associationClass',
  generalizationSets: 'generalizationSet',
  annotations: 'annotation',
}
const names: Record<string, string> = {
  stereotypes: 'stereotype',
  constraints: 'constraint',
  relationships: 'relationship',
  isConstructor: 'constructor',
  template: 'templateRef',
  parameter: 'parameterRef',
  classifier: 'classifierRef',
  association: 'associationRef',
}
const enums = new Set(['kind', 'visibility', 'direction', 'navigability', 'aggregation'])
const types = new Set(['type', 'returns', 'bound', 'defaultType'])
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid structured UML value')
  return value as Record<string, unknown>
}
const quote = (value: unknown) => {
  if (typeof value !== 'string') throw new Error('Expected UML text')
  return JSON.stringify(value)
}
function properties(value: Record<string, unknown>, named = false): string {
  const lines: string[] = []
  for (const [key, item] of Object.entries(value)) {
    if (item === undefined || (named && (key === 'id' || key === 'name'))) continue
    if (key === 'targets') {
      if (!Array.isArray(item)) throw new Error('Invalid UML annotation targets')
      item.forEach((target, i) => {
        const t = record(target)
        const props = Object.entries(t).map(([k, v]) =>
          `${
            {
              element: 'targetElement',
              member: 'targetMember',
              relationship: 'targetRelationship',
              end: 'targetEndId',
            }[k] ?? k
          } ${quote(v)}`
        ).join('\n')
        lines.push(`target ${quote(`target${i}`)} {\n${props}\n}`)
      })
    } else if (key === 'multiplicity') {
      const bounds = record(item)
      if (typeof bounds['lower'] !== 'number' || !(typeof bounds['upper'] === 'number' || bounds['upper'] === '*')) {
        throw new Error('Invalid UML multiplicity')
      }
      lines.push(`multiplicity ${quote(formatUmlMultiplicity({ lower: bounds['lower'], upper: bounds['upper'] }))}`)
    } else if (types.has(key)) {
      const container = record(item)
      if (key === 'returns' && !container['type']) {
        lines.push(`returns {\n${properties(container)}\n}`)
        continue
      }
      const t = key === 'returns' ? record(container['type']) : container
      const prefix = 'classifier' in t ? 'ref ' : ''
      const type = t['classifier'] ?? t['external']
      const extra = key === 'returns'
        ? properties(Object.fromEntries(Object.entries(container).filter(([k]) => k !== 'type')))
        : ''
      lines.push(`${key} ${prefix}${quote(type)}${extra ? ` {\n${extra}\n}` : ''}`)
    } else if (key === 'source' || key === 'target') {
      lines.push(`${key}End {\n${properties(record(item))}\n}`)
    } else if (Array.isArray(item)) {
      if (arrayBlocks[key]) {
        item.forEach((entry, index) => {
          const r = record(entry)
          const id = r['id'] ?? r['parameter'] ?? `entry${index}`
          lines.push(
            `${arrayBlocks[key]} ${quote(id)}${r['name'] !== undefined ? ` ${quote(r['name'])}` : ''} {\n${
              properties(r, true)
            }\n}`,
          )
        })
      } else {
        for (const v of item) lines.push(`${names[key] ?? key} ${quote(v)}`)
      }
    } else if (typeof item === 'boolean') lines.push(`${names[key] ?? key} ${item}`)
    else lines.push(`${names[key] ?? key} ${enums.has(key) ? String(item) : quote(item)}`)
  }
  return lines.join('\n')
}
export function printUmlClassifier(value: UmlClassifier): string {
  return `classifier {\n${properties(record(value))}\n}`
}
export function printUmlRelationship(value: UmlBinaryRelationship): string {
  return `uml {\n${properties(record(value))}\n}`
}
export function printUmlExtensions(value: UmlModelExtensions): string {
  return `umlModel {\n${properties(record(value))}\n}`
}

export function printUmlPresentation(value: import('@likec4/core').UmlPresentation): string {
  const lines = [
    ...(value.hiddenMembers ?? []).map(id => `hideMember ${quote(id)}`),
    ...(value.hiddenCompartments ?? []).map(id => `hideCompartment ${quote(id)}`),
    ...(value.visibility ?? []).map(visibility => `visibility ${visibility}`),
  ]
  return `umlPresentation {\n${lines.join('\n')}\n}`
}
