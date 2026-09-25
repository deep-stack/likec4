/** Structured fields rendered by the native table shape. Omitted metadata is unknown. */
export interface TableField {
  readonly id: string
  readonly title: string
  readonly type: string
  readonly nullable?: boolean
  readonly keys?: readonly ('primary' | 'unique')[]
}
export interface TableDefinition {
  readonly fields: readonly TableField[]
}
export interface TableEndpointCardinality {
  readonly min: 0 | 1
  readonly max: 1 | 'many'
}
/** Ordered pairs belong to one logical relationship, including composite references. */
export interface TableRelationship {
  readonly pairs: readonly { readonly source: string; readonly target: string }[]
  readonly sourceCardinality?: TableEndpointCardinality
  readonly targetCardinality?: TableEndpointCardinality
}
