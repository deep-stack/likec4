import type { DiagramEdge } from '@likec4/core/types'
import { css, cx } from '@likec4/styles/css'
import { edgePath } from '@likec4/styles/recipes'
import { type PointerEventHandler, forwardRef } from 'react'
import type { UndefinedOnPartialDeep } from 'type-fest'
import type { BaseEdgePropsWithData } from '../../base/types'
import { arrowTypeToMarker, EdgeMarkers, UmlOpenArrow, UmlTriangle } from './EdgeMarkers'

type Data = UndefinedOnPartialDeep<
  Pick<
    DiagramEdge,
    | 'line'
    | 'dir'
    | 'tail'
    | 'head'
  >
>

type EdgePathProps = {
  edgeProps: BaseEdgePropsWithData<Data>
  svgPath: string
  /**
   * If true, the edge is being dragged (used to disable animations)
   */
  isDragging?: boolean
  strokeWidth?: number
  /** Compact dashes for dense diagrams; retains the authored line kind. */
  compact?: boolean
  notation?: 'uml' | undefined
  onEdgePointerDown?: PointerEventHandler<SVGGElement> | undefined
}

export const EdgePath = forwardRef<SVGPathElement, EdgePathProps>(({
  edgeProps: {
    id,
    data: {
      line,
      dir,
      tail,
      head,
    },
    selectable = true,
    style,
    interactionWidth,
  },
  isDragging = false, // omit
  onEdgePointerDown,
  strokeWidth,
  compact = false,
  notation,
  svgPath,
}, svgPathRef) => {
  let markerStartName = arrowTypeToMarker(tail)
  let markerEndName = arrowTypeToMarker(head ?? 'normal')
  if (dir === 'back') {
    ;[markerStartName, markerEndName] = [markerEndName, markerStartName]
  }

  const marker = (name: typeof markerStartName) =>
    notation === 'uml' && name === 'OArrow' ?
      UmlTriangle
      : notation === 'uml' && name === 'Open' ?
      UmlOpenArrow
      : name
      ? EdgeMarkers[name]
      : null
  const MarkerStart = marker(markerStartName)
  const MarkerEnd = marker(markerEndName)

  const isDotted = line === 'dotted'
  const isDashed = isDotted || line === 'dashed'

  let strokeDasharray: string | undefined
  if (isDotted) {
    strokeDasharray = compact ? '1,6' : '1,8'
  } else if (isDashed) {
    strokeDasharray = compact ? '6,7' : '8,10'
  }

  const classes = edgePath()

  return (
    <>
      {selectable && (
        <path
          className={cx(
            'react-flow__edge-interaction',
            css({
              fill: 'none',
            }),
          )}
          onPointerDown={onEdgePointerDown}
          d={svgPath}
          style={{
            strokeWidth: interactionWidth ?? 10,
            stroke: 'currentcolor',
            strokeOpacity: 0,
            ...isDragging ? { display: 'none' } : {},
          }}
        />
      )}
      <circle
        className={cx(
          // This class is queried by RelationshipPopover to position in the middle of the edge
          'likec4-edge-middle-point',
          classes.middlePoint,
        )}
        data-edge-id={id}
        style={{
          offsetPath: `path("${svgPath}")`,
        }}
      />

      <g className={classes.markersCtx} onPointerDown={onEdgePointerDown}>
        <defs>
          {MarkerStart && <MarkerStart id={'start' + id} />}
          {MarkerEnd && <MarkerEnd id={'end' + id} />}
        </defs>
        <path
          className={cx(
            'react-flow__edge-path',
            'hide-on-reduced-graphics',
            classes.pathBg,
            isDragging && css({ display: 'none' }),
          )}
          d={svgPath}
          style={style}
          strokeLinejoin={'round'}
          strokeLinecap={'round'}
        />
        <path
          ref={svgPathRef}
          className={cx(
            'react-flow__edge-path',
            classes.path,
            selectable && 'react-flow__edge-interaction',
          )}
          d={svgPath}
          style={style}
          strokeWidth={strokeWidth}
          strokeLinejoin={'round'}
          strokeLinecap={'round'}
          strokeDasharray={strokeDasharray}
          markerStart={MarkerStart ? `url(#start${id})` : undefined}
          markerEnd={MarkerEnd ? `url(#end${id})` : undefined}
        />
      </g>
    </>
  )
})
EdgePath.displayName = 'EdgePath'
