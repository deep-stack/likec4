import { useReactFlow } from '@xyflow/react'
import { useEffect, useRef } from 'react'
import { ElementNodeContainer } from '../../../base-primitives/element/ElementNodeContainer'
import { DefaultHandles } from '../../../base-primitives/NodeHandles'
import { TableFields } from '../../../base-primitives/table/TableFields'
import { useEnabledFeatures } from '../../../context/DiagramFeatures'
import { useDiagramActorRef, useDiagramContext } from '../../../hooks/useDiagram'
import { activeTable, tableNeighbourhood } from '../../state/tableNeighbourhood'
import type { Types } from '../../types'

export function TableNode(props: Types.NodeProps<'element'>) {
  const actor = useDiagramActorRef()
  const flow = useReactFlow()
  useEffect(() => () => actor.send({ type: 'table.focus', node: null }), [actor, props.data.viewId])
  const { enableReadOnly } = useEnabledFeatures()
  const drag = useRef<{ pointer: number; start: { x: number; y: number }; position: { x: number; y: number } } | null>(
    null,
  )
  const state = useDiagramContext(ctx => ({
    active: activeTable(ctx),
    edges: ctx.xyedges.filter(edge => !edge.hidden && 'tableRelation' in edge.data && edge.data.tableRelation),
  }))
  const related = !state.active || tableNeighbourhood(state.active, state.edges).nodes.has(props.id)
  const foreignFields = new Set(
    state.edges.flatMap(edge =>
      edge.target === props.id && 'tableRelation' in edge.data
        ? edge.data.tableRelation?.pairs.map(pair => pair.target) ?? []
        : []
    ),
  )
  return (
    <ElementNodeContainer
      nodeProps={{ ...props, selectable: false }}
      className="likec4-table"
      data-er-related={String(related)}>
      <div
        className="nopan"
        tabIndex={0}
        role="group"
        aria-label={`Table ${props.data.title}`}
        onFocus={() => actor.send({ type: 'table.focus', node: props.data.id })}
        onBlur={() => actor.send({ type: 'table.focus', node: null })}
        onPointerDown={event => {
          if (!enableReadOnly || event.button !== 0) return
          event.stopPropagation()
          event.currentTarget.setPointerCapture(event.pointerId)
          const node = flow.getNode(props.id)
          if (!node) return
          drag.current = {
            pointer: event.pointerId,
            start: flow.screenToFlowPosition({ x: event.clientX, y: event.clientY }),
            position: node.position,
          }
        }}
        onPointerMove={event => {
          const origin = drag.current
          if (!origin || event.pointerId !== origin.pointer) return
          const point = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY })
          actor.send({
            type: 'xyflow.applyChanges',
            nodes: [{
              id: props.id,
              type: 'position',
              dragging: true,
              position: {
                x: origin.position.x + point.x - origin.start.x,
                y: origin.position.y + point.y - origin.start.y,
              },
            }],
          })
        }}
        onPointerUp={event => {
          if (!drag.current) return
          drag.current = null
          actor.send({ type: 'xyflow.applyChanges', nodes: [{ id: props.id, type: 'position', dragging: false }] })
          event.currentTarget.releasePointerCapture(event.pointerId)
        }}
        onLostPointerCapture={() => {
          if (!drag.current) return
          drag.current = null
          actor.send({ type: 'xyflow.applyChanges', nodes: [{ id: props.id, type: 'position', dragging: false }] })
        }}>
        <TableFields table={props.data.table!} title={props.data.title} foreignFields={foreignFields} />
      </div>
      <DefaultHandles direction="LR" />
    </ElementNodeContainer>
  )
}
