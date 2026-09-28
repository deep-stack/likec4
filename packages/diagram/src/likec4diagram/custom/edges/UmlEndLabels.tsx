import { umlEndText } from '@likec4/core'
import { moveUmlSpline } from '@likec4/core/geometry'
import { useInternalNode } from '@xyflow/react'
import type { Types } from '../../types'

/** Graphviz reserves these bounds independently from the relationship title. */
export function UmlEndLabels({ data, source, target }: Types.EdgeProps<'relationship'>) {
  const sourceNode = useInternalNode(source)
  const targetNode = useInternalNode(target)
  let sourceDelta = [0, 0], targetDelta = [0, 0]
  if (data.umlNodeBounds && sourceNode && targetNode) {
    const bounds = (node: typeof sourceNode, fallback: typeof data.umlNodeBounds.source) => ({
      ...node.internals.positionAbsolute,
      width: node.measured.width ?? fallback.width,
      height: node.measured.height ?? fallback.height,
    })
    const s = bounds(sourceNode, data.umlNodeBounds.source), t = bounds(targetNode, data.umlNodeBounds.target)
    const back = data.dir === 'back'
    const moved = moveUmlSpline(
      data.points,
      back ? data.umlNodeBounds.target : data.umlNodeBounds.source,
      back ? data.umlNodeBounds.source : data.umlNodeBounds.target,
      back ? t : s,
      back ? s : t,
    )
    const first = [moved[0][0] - data.points[0][0], moved[0][1] - data.points[0][1]]
    const last = [moved.at(-1)![0] - data.points.at(-1)![0], moved.at(-1)![1] - data.points.at(-1)![1]]
    ;[sourceDelta, targetDelta] = back ? [last, first] : [first, last]
  }
  if (!data.uml || !data.umlEndLabels) return null
  return (
    <g className="likec4-uml-end-labels" fontSize={14} fill="var(--mantine-color-text)" pointerEvents="none">
      {(['source', 'target'] as const).map(side => {
        const original = data.umlEndLabels?.[side]
        const delta = side === 'source' ? sourceDelta : targetDelta
        const box = original && { ...original, x: original.x + delta[0]!, y: original.y + delta[1]! }
        const point = (side === 'source') !== (data.dir === 'back') ? data.points[0] : data.points.at(-1)!
        const x = point[0] + delta[0]!, y = point[1] + delta[1]!
        const lines = umlEndText(data.uml![side])
        return (
          <g key={side} aria-label={lines.join(', ')}>
            {box && lines.map((line, i) => (
              <g key={i}>
                {line.startsWith('[') && (
                  <rect
                    x={box.x - 3}
                    y={box.y + i * 16 - 1}
                    width={box.width + 6}
                    height={18}
                    fill="var(--mantine-color-body)"
                    stroke="var(--mantine-color-text)" />
                )}
                <text x={box.x + box.width / 2} y={box.y + 14 + i * 16} textAnchor="middle">
                  {line.startsWith('[') ? line.slice(1, -1) : line}
                </text>
              </g>
            ))}
            {data.uml![side].navigability === 'nonNavigable' && (
              <path
                d={`M${x - 4},${y - 4} l8,8 M${x - 4},${y + 4} l8,-8`}
                stroke="var(--mantine-color-text)"
                strokeWidth={1.5}
                aria-label="Not navigable" />
            )}
          </g>
        )
      })}
    </g>
  )
}
