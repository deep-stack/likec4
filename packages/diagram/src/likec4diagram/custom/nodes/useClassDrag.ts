import { useReactFlow } from '@xyflow/react'
import { useRef } from 'react'
import type { PointerEvent } from 'react'
import { useEnabledFeatures } from '../../../context/DiagramFeatures'
import { useDiagramActorRef } from '../../../hooks/useDiagram'

/** Read-only diagrams allow local rearrangement without source mutations. */
export function useClassDrag(id: string) {
  const flow = useReactFlow()
  const actor = useDiagramActorRef()
  const { enableReadOnly } = useEnabledFeatures()
  const drag = useRef<{ pointer: number; start: { x: number; y: number }; position: { x: number; y: number } } | null>(
    null,
  )
  const end = () => {
    if (!drag.current) return
    drag.current = null
    actor.send({ type: 'xyflow.applyChanges', nodes: [{ id, type: 'position', dragging: false }] })
  }
  return {
    onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
      if (!enableReadOnly || event.button !== 0 || (event.target as HTMLElement).closest('button,[role="button"]')) {
        return
      }
      const node = flow.getNode(id)
      if (!node) return
      event.stopPropagation()
      event.currentTarget.setPointerCapture(event.pointerId)
      drag.current = {
        pointer: event.pointerId,
        start: flow.screenToFlowPosition({ x: event.clientX, y: event.clientY }),
        position: node.position,
      }
    },
    onPointerMove: (event: PointerEvent<HTMLDivElement>) => {
      const origin = drag.current
      if (!origin || origin.pointer !== event.pointerId) return
      const point = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY })
      actor.send({
        type: 'xyflow.applyChanges',
        nodes: [{
          id,
          type: 'position',
          dragging: true,
          position: {
            x: origin.position.x + point.x - origin.start.x,
            y: origin.position.y + point.y - origin.start.y,
          },
        }],
      })
    },
    onPointerUp: (event: PointerEvent<HTMLDivElement>) => {
      if (!drag.current) return
      end()
      event.currentTarget.releasePointerCapture(event.pointerId)
    },
    onLostPointerCapture: end,
  }
}
