import { ActionIcon, Group, Tooltip } from '@mantine/core'
import { IconPlayerPause, IconPlayerPlay, IconRestore } from '@tabler/icons-react'
import { Panel } from '@xyflow/react'
import { useDiagramActorRef, useDiagramContext } from '../../../hooks/useDiagram'

export function TableControls() {
  const actor = useDiagramActorRef()
  const { hasTables, enabled } = useDiagramContext(ctx => ({
    hasTables: ctx.xynodes.some(n => 'table' in n.data && !!n.data.table),
    enabled: ctx.tableFlowEnabled,
  }))
  if (!hasTables) return null
  return (
    <Panel position="bottom-right">
      <Group gap={4} className="likec4-table-controls">
        <Tooltip label={enabled ? 'Pause relationship flow' : 'Animate relationship flow'}>
          <ActionIcon
            variant="default"
            aria-label={enabled ? 'Pause relationship flow' : 'Animate relationship flow'}
            aria-pressed={enabled}
            onClick={() => actor.send({ type: 'table.toggleFlow' })}>
            {enabled ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Reset table positions">
          <ActionIcon
            variant="default"
            aria-label="Reset table positions"
            onClick={() => actor.send({ type: 'table.resetPositions' })}>
            <IconRestore size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Panel>
  )
}
