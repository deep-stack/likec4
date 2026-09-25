import type { TableEndpointCardinality } from '@likec4/core'
import { useReducedMotion } from '@mantine/hooks'
import { useId } from 'react'
import { useDiagramContext } from '../../../hooks/useDiagram'
import { translateTablePath } from '../../../utils/table-path'
import { activeTable } from '../../state/tableNeighbourhood'
import type { Types } from '../../types'

function Cardinality({ id, value }: { id: string; value: TableEndpointCardinality }) {
  // Marker points towards the table. The far symbol encodes the minimum;
  // the near symbol encodes the maximum. Unknown endpoints have no marker.
  return (
    <marker
      id={id}
      viewBox="-25 -10 26 20"
      refX={0}
      refY={0}
      markerWidth={26}
      markerHeight={20}
      markerUnits="userSpaceOnUse"
      orient="auto-start-reverse">
      <g fill="none" stroke="currentColor" strokeWidth={1.4}>
        {value.max === 'many' ? <path d="M -12 0 L -1 -7 M -12 0 L -1 7 M -12 0 H -1" /> : <path d="M -5 -7 V 7" />}
        {value.min === 0
          ? <circle cx={-19} cy={0} r={4.5} fill="var(--mantine-color-body)" />
          : <path d="M -16 -7 V 7" />}
      </g>
    </marker>
  )
}

export function TableRelationshipEdge(props: Types.EdgeProps<'relationship'>) {
  const ns = `table-${useId().replaceAll(':', '')}`
  const reducedMotion = useReducedMotion()
  const state = useDiagramContext(ctx => ({
    nodes: ctx.xynodes,
    active: activeTable(ctx),
    motion: ctx.tableFlowEnabled,
  }))
  const absolute = (id: string): { x: number; y: number } => {
    const node = state.nodes.find(n => n.id === id)
    if (!node) return { x: 0, y: 0 }
    const parent = node.parentId ? absolute(node.parentId) : { x: 0, y: 0 }
    return { x: node.position.x + parent.x, y: node.position.y + parent.y }
  }
  const delta = (id: string) => {
    const node = state.nodes.find(n => n.id === id)
    const position = absolute(id)
    return { x: position.x - (node?.data.x ?? 0), y: position.y - (node?.data.y ?? 0) }
  }
  const relation = props.data.tableRelation!
  const related = !state.active || state.active === props.source || state.active === props.target
  const highlighted = !!state.active && related
  const paths = props.data.tablePaths ?? [props.data.points]
  return (
    <g
      className="likec4-table-edge"
      data-er-highlighted={String(highlighted)}
      data-er-related={String(related)}
      data-table-edge={props.id}
      opacity={props.data.dimmed ? .15 : related ? 1 : .15}>
      <defs>
        {relation.sourceCardinality && <Cardinality id={`${ns}-source`} value={relation.sourceCardinality} />}
        {relation.targetCardinality && <Cardinality id={`${ns}-target`} value={relation.targetCardinality} />}
        <radialGradient id={`${ns}-particle`}>
          <stop offset="0%" stopColor="currentColor" />
          <stop offset="100%" stopColor="currentColor" stopOpacity={.4} />
        </radialGradient>
      </defs>
      {paths.map((saved, index) => {
        const points = translateTablePath(saved, delta(props.source), delta(props.target))
        const d = `M ${points[0]!.join(',')} ` + Array.from({ length: (points.length - 1) / 3 }, (_, segment) =>
          `C ${
            points.slice(1 + segment * 3, 4 + segment * 3).map(p => p.join(',')).join(' ')
          }`).join(' ')
        const label = (v: TableEndpointCardinality | undefined) =>
          v ? `${v.min}..${v.max === 'many' ? 'many' : v.max}` : 'unknown'
        return (
          <g key={index} data-table-pair={index}>
            <title>
              {`${relation.pairs[index]?.source} (${label(relation.sourceCardinality)}) to ${
                relation.pairs[index]?.target
              } (${label(relation.targetCardinality)})`}
            </title>
            <path
              className="react-flow__edge-path likec4-table-edge-path"
              d={d}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              markerStart={relation.sourceCardinality ? `url(#${ns}-source)` : undefined}
              markerEnd={relation.targetCardinality ? `url(#${ns}-target)` : undefined} />
            <path d={d} fill="none" stroke="transparent" strokeWidth={20} className="react-flow__edge-interaction" />
            {highlighted && state.motion && !reducedMotion &&
              Array.from(
                { length: 6 },
                (_, particle) => (
                  <ellipse
                    key={particle}
                    className="likec4-table-particle"
                    rx={5}
                    ry={1.2}
                    fill={`url(#${ns}-particle)`}>
                    <animateMotion
                      begin={`${-particle}s`}
                      dur="6s"
                      repeatCount="indefinite"
                      rotate="auto"
                      path={d}
                      calcMode="spline"
                      keySplines="0.42, 0, 0.58, 1.0" />
                  </ellipse>
                ),
              )}
          </g>
        )
      })}
    </g>
  )
}
