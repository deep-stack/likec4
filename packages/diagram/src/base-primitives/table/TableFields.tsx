import type { TableDefinition } from '@likec4/core'
import { tableGeometry } from '@likec4/core/geometry'
import { Handle, Position } from '@xyflow/react'

export function TableFields({ table, title, foreignFields }: {
  table: TableDefinition
  title: string
  foreignFields: ReadonlySet<string>
}) {
  const geometry = tableGeometry(table, title)
  return (
    <>
      <div className="likec4-table-header" style={{ height: geometry.headerHeight }}>
        <span aria-hidden>▦</span> {title}
      </div>
      {table.fields.map((field, index) => {
        const row = geometry.rows[index]!
        const key = [
          field.keys?.includes('primary') && 'PK',
          field.keys?.includes('unique') && 'UK',
          foreignFields.has(field.id) && 'FK',
        ].filter(Boolean).join(' ')
        return (
          <div key={field.id} className="likec4-table-row" data-field={field.id} style={{ height: row.height }}>
            <span className="likec4-table-key" title={key || 'No supplied key constraint'}>{key}</span>
            <span className="likec4-table-name" title={field.title}>{field.title}</span>
            <span className="likec4-table-type" title={field.type}>{field.type}</span>
            {field.nullable !== undefined && (
              <span
                title={field.nullable ? 'Nullable' : 'Not nullable'}
                aria-label={field.nullable ? 'Nullable' : 'Not nullable'}>
                {field.nullable ? '◇' : '◆'}
              </span>
            )}
            <Handle
              type="source"
              position={Position.Right}
              id={`${field.id}-source`}
              style={{ top: row.y + row.height / 2 }} />
            <Handle
              type="target"
              position={Position.Left}
              id={`${field.id}-target`}
              style={{ top: row.y + row.height / 2 }} />
          </div>
        )
      })}
    </>
  )
}
