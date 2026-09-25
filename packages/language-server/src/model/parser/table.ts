import type { TableDefinition, TableEndpointCardinality, TableRelationship } from '@likec4/core'
import { ast } from '../../ast'

export function parseTable(node: ast.TableProperty | undefined): TableDefinition | undefined {
  if (!node) return undefined
  return {
    fields: node.fields.map(field => {
      const keys = field.props.filter(ast.isTableFieldKey).map(p =>
        p.key === 'primaryKey' ? 'primary' as const : 'unique' as const
      )
      const nullable = field.props.find(ast.isTableFieldNullable)
      return {
        id: field.name,
        title: field.props.find(ast.isTableFieldTitle)?.value ?? field.name,
        type: field.type,
        ...(keys.length > 0 && { keys }),
        ...(nullable && { nullable: nullable.value }),
      }
    }),
  }
}
export function parseTableRelation(node: ast.TableRelationProperty | undefined): TableRelationship | undefined {
  if (!node) return undefined
  const cardinality = (value: string): TableEndpointCardinality => ({
    min: value.startsWith('zero') ? 0 : 1,
    max: value === 'many' || value === 'zeroOrMany' ? 'many' : 1,
  })
  const source = node.props.find(p => ast.isTableCardinality(p) && p.key === 'sourceCardinality')
  const target = node.props.find(p => ast.isTableCardinality(p) && p.key === 'targetCardinality')
  return {
    pairs: node.props.filter(ast.isTableFieldPair).map(p => ({ source: p.source, target: p.target })),
    ...(source && ast.isTableCardinality(source) && { sourceCardinality: cardinality(source.value) }),
    ...(target && ast.isTableCardinality(target) && { targetCardinality: cardinality(target.value) }),
  }
}
