import type { TableDefinition } from '../types/table'

/** Shared pixel geometry keeps layout ports and rendered field rows aligned. */
export function tableGeometry(table: TableDefinition, title: string) {
  const width = Math.max(
    320,
    Math.max(title.length * 9 + 48, ...table.fields.map(field => (field.title.length + field.type.length) * 8 + 100)),
  )
  const rows = table.fields.map((field, index) => ({
    id: field.id,
    port: `field${index}`,
    y: 40 + index * 36,
    height: 36,
  }))
  return { width, height: 40 + rows.length * 36, headerHeight: 40, rows }
}
