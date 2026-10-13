import type { TableDefinition } from '@likec4/core'
import { tableGeometry } from '@likec4/core/geometry'
import { Handle, Position } from '@xyflow/react'
import { tablePreview } from '../../likec4diagram/state/tableDisplay'

export function TableFields({ table, title, foreignFields, preview, revealed }: {
  table: TableDefinition
  title: string
  revealed?: string | undefined
  foreignFields: ReadonlySet<string>
  preview?: { required: ReadonlySet<string>; expanded: boolean; toggle: () => void } | undefined
}) {
  const shown = preview ? tablePreview(table, title, preview.required, preview.expanded) : null
  const geometry = shown ?? tableGeometry(table, title)
  return (
    <>
      <div className="likec4-table-header" style={{ height: geometry.headerHeight }}>
        <span aria-hidden>▦</span> {title}
      </div>
      {(shown?.fields ?? table.fields).map((field, index) => {
        const row = geometry.rows[index]!
        const key = [
          field.keys?.includes('primary') && 'PK',
          field.keys?.includes('unique') && 'UK',
          foreignFields.has(field.id) && 'FK',
        ].filter(Boolean).join(' ')
        return (
          <div
            key={field.id}
            className="likec4-table-row"
            data-field={field.id}
            style={{
              height: row.height,
              outline: revealed === field.id ? '2px solid orange' : undefined,
              outlineOffset: -2,
            }}>
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
      {preview && shown && shown.hidden > 0 && (
        <button
          type="button"
          className="nodrag nopan likec4-table-expand"
          aria-expanded={preview.expanded}
          aria-label={`${title}: ${preview.expanded ? 'Show fewer fields' : `Show ${shown.hidden} more fields`}`}
          style={{
            height: 36,
            width: '100%',
            border: 0,
            borderTop: '1px solid currentColor',
            cursor: 'pointer',
            color: 'inherit',
            background: 'var(--mantine-color-body)',
          }}
          onPointerDown={event => event.stopPropagation()}
          onClick={event => {
            event.stopPropagation()
            preview.toggle()
          }}>
          {preview.expanded ? 'Show fewer fields' : `+ Show ${shown.hidden} more fields`}
        </button>
      )}
    </>
  )
}
