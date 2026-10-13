import type { TableEndpointCardinality } from '@likec4/core'
import { edgePath } from '@likec4/styles/recipes'
import { useReducedMotion } from '@mantine/hooks'
import { useId } from 'react'
import { useDiagramContext } from '../../../hooks/useDiagram'
import { translateTablePath } from '../../../utils/table-path'
import { tableDisplayPath } from '../../state/tableDisplay'
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
    edges: ctx.xyedges,
    preview: ctx.tablePreview?.view === ctx.view.id ? ctx.tablePreview : null,
    active: activeTable(ctx),
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
      data-edge-active={highlighted}
      data-er-highlighted={String(highlighted)}
      data-er-related={String(related)}
      data-table-edge={props.id}
      opacity={props.data.dimmed ? .15 : 1}>
      <defs>
        {relation.sourceCardinality && <Cardinality id={`${ns}-source`} value={relation.sourceCardinality} />}
        {relation.targetCardinality && <Cardinality id={`${ns}-target`} value={relation.targetCardinality} />}
      </defs>
      {paths.map((saved, index) => {
        const points = translateTablePath(saved, delta(props.source), delta(props.target))
        const fallback = `M ${points[0]!.join(',')} ` + Array.from({ length: (points.length - 1) / 3 }, (_, segment) =>
          `C ${
            points.slice(1 + segment * 3, 4 + segment * 3).map(p => p.join(',')).join(' ')
          }`).join(' ')
        const pair = relation.pairs[index]
        const d = pair
          ? tableDisplayPath(
            state.nodes,
            state.edges,
            state.preview?.expanded ?? Object.fromEntries(state.nodes.map(n => [n.id, true])),
            props.source,
            props.target,
            pair.source,
            pair.target,
          ) ?? fallback
          : fallback
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
              strokeOpacity={highlighted && !reducedMotion ? .25 : 1}
              markerStart={relation.sourceCardinality ? `url(#${ns}-source)` : undefined}
              markerEnd={relation.targetCardinality ? `url(#${ns}-target)` : undefined} />
            <path d={d} fill="none" stroke="transparent" strokeWidth={20} className="react-flow__edge-interaction" />
            {highlighted && !reducedMotion && (
              <path
                className={`${edgePath().path} likec4-table-flow`}
                d={d}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeDasharray="8,10"
                strokeLinecap="round"
                pointerEvents="none" />
            )}
          </g>
        )
      })}
    </g>
  )
}
