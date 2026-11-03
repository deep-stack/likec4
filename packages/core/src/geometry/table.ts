import type { TableDefinition } from '../types/table'

/** Width of the badge column: none unless a field has a badge, else room for the longest one. */
function badgeColumn(table: TableDefinition) {
  const longest = Math.max(0, ...table.fields.map(field => field.badge?.text.length ?? 0))
  return longest > 0 ? longest * 7 + 20 : 0
}

/** Shared pixel geometry keeps layout ports and rendered field rows aligned. */
export function tableGeometry(table: TableDefinition, title: string) {
  const badgeWidth = badgeColumn(table)
  const width = Math.max(
    320,
    Math.max(
      title.length * 9 + 48,
      ...table.fields.map(field =>
        (field.title.length + field.type.length) * 8 + 100 + (badgeWidth > 0 ? badgeWidth + 10 : 0)
      ),
    ),
  )
  const rows = table.fields.map((field, index) => ({
    id: field.id,
    port: `field${index}`,
    y: 40 + index * 36,
    height: 36,
  }))
  return { width, height: 40 + rows.length * 36, headerHeight: 40, badgeWidth, rows }
}
