import { ActionIcon, Button, Group, TextInput, Tooltip } from '@mantine/core'
import { useReducedMotion } from '@mantine/hooks'
import { IconRestore } from '@tabler/icons-react'
import { Panel } from '@xyflow/react'
import { useState } from 'react'
import { useEnabledFeatures } from '../../../context/DiagramFeatures'
import { useDiagramActorRef, useDiagramContext } from '../../../hooks/useDiagram'
import { absolutePosition, requiredFields, tablePreview, tableToggle } from '../../state/tableDisplay'

export function TableControls() {
  const actor = useDiagramActorRef()
  const [query, setQuery] = useState('')
  const reducedMotion = useReducedMotion()
  const readOnly = useEnabledFeatures().enableReadOnly
  const toggle = useDiagramContext(tableToggle)
  const { hasTables, preview, nodes } = useDiagramContext(ctx => ({
    nodes: ctx.xynodes,
    hasTables: ctx.xynodes.some(n => 'table' in n.data && !!n.data.table),
    preview: ctx.tablePreview?.view === ctx.view.id,
  }))
  if (!hasTables) return null
  const matches = query.trim() ?
    nodes.flatMap(node =>
      'table' in node.data && node.data.table
        ? node.data.table.fields.filter(f =>
          `${node.data.title} ${f.title}`.toLowerCase().includes(query.trim().toLowerCase())
        )
          .map(field => ({ node, field })) :
        []
    ).slice(0, 10) :
    []
  function reveal(node: typeof nodes[number], field: string) {
    actor.send({ type: 'table.reveal', node: node.data.id, field })
    const ctx = actor.getSnapshot().context
    const current = ctx.xynodes.find(n => n.id === node.id)
    if (!current || !('table' in current.data) || !current.data.table) return
    const pos = absolutePosition(ctx.xynodes, node.id)
    const row = tablePreview(current.data.table, current.data.title, requiredFields(node.id, ctx.xyedges), true).rows
      .find(r => r.id === field)
    void ctx.xyflow?.setCenter(pos.x + (current.width ?? 320) / 2, pos.y + (row?.y ?? 0), {
      zoom: Math.max(.8, ctx.viewport.zoom),
      duration: reducedMotion ? 0 : 200,
    })
  }
  return (
    <Panel position="bottom-right">
      {preview && (
        <div style={{ background: 'var(--mantine-color-body)', padding: 4, maxWidth: 320 }}>
          {query && (
            <div role="list" aria-label="Matching table fields" style={{ maxHeight: 180, overflowY: 'auto' }}>
              {matches.map(({ node, field }) => (
                <Button
                  key={`${node.id}:${field.id}`}
                  variant="subtle"
                  size="compact-xs"
                  style={{ display: 'block' }}
                  onClick={() => reveal(node, field.id)}>
                  {node.data.title}: {field.title}
                </Button>
              ))}
              {!matches.length && <span>No matching fields</span>}
            </div>
          )}
          <TextInput
            size="xs"
            aria-label="Find table or field"
            placeholder="Find table or field…"
            value={query}
            onChange={event => setQuery(event.currentTarget.value)} />
        </div>
      )}
      {readOnly
        ? toggle.visible && (
          // Read-only tables cannot be moved: one toggle expands or collapses them all.
          <Group gap={4} className="likec4-table-controls">
            <Button
              size="compact-xs"
              variant="default"
              aria-label={toggle.expanded ? 'Collapse all tables' : 'Expand all tables'}
              onClick={() => actor.send({ type: 'table.expand', expanded: !toggle.expanded })}>
              {toggle.expanded ? 'Collapse all' : 'Expand all'}
            </Button>
          </Group>
        )
        : (
          <Group gap={4} className="likec4-table-controls">
            {preview && (
              <>
                <Button
                  size="compact-xs"
                  variant="default"
                  onClick={() => actor.send({ type: 'table.expand', expanded: true })}>
                  Expand all tables
                </Button>
                <Button
                  size="compact-xs"
                  variant="default"
                  onClick={() => actor.send({ type: 'table.expand', expanded: false })}>
                  Collapse all tables
                </Button>
              </>
            )}
            <Tooltip label="Reset table positions">
              <ActionIcon
                variant="default"
                aria-label="Reset table positions"
                onClick={() => actor.send({ type: 'table.resetPositions' })}>
                <IconRestore size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        )}
    </Panel>
  )
}
