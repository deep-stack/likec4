// oxlint-disable exhaustive-deps
import { moveUmlSpline, vector } from '@likec4/core/geometry'
import { nonNullable } from '@likec4/core/utils'
import type { XYPosition } from '@xyflow/react'
import { getNodeDimensions } from '@xyflow/system'
import { curveCatmullRomOpen, line as d3line } from 'd3-shape'
import { shallowEqual } from 'fast-equals'
import { useCallback } from 'react'
import { first, isTruthy, last } from 'remeda'
import { useXYStore } from '../../../hooks/useXYFlow'
import {
  bezierPath,
  getNodeIntersectionFromCenterToPoint,
} from '../../../utils/xyflow'
import type { Types } from '../../types'

const curve = d3line<XYPosition>()
  .curve(curveCatmullRomOpen.alpha(0.7))
  .x(d => Math.trunc(d.x))
  .y(d => Math.trunc(d.y))

/**
 * @returns SVG path data string for relationship edge
 */
export function useRelationshipEdgePath({
  props: {
    sourceX,
    sourceY,
    source,
    target,
    targetX,
    targetY,
    data,
  },
  controlPoints,
  isControlPointDragging,
}: {
  props: Types.EdgeProps<'relationship'>
  controlPoints: XYPosition[]
  isControlPointDragging: boolean
}): string {
  // Subscribe to mimimal node changes to update edge path when nodes move
  const [
    sourceNodeWidth,
    sourceNodeHeight,
    targetNodeWidth,
    targetNodeHeight,
    sourceLeft,
    sourceTop,
    targetLeft,
    targetTop,
  ] = useXYStore(
    useCallback(({ nodeLookup }) => {
      const sourceInternal = nonNullable(nodeLookup.get(source), `source node ${source} not found`)
      const targetInternal = nonNullable(nodeLookup.get(target), `target node ${target} not found`)
      const sourceNode = getNodeDimensions(sourceInternal)
      const targetNode = getNodeDimensions(targetInternal)
      return [
        Math.ceil(sourceNode.width),
        Math.ceil(sourceNode.height),
        Math.ceil(targetNode.width),
        Math.ceil(targetNode.height),
        sourceInternal.internals.positionAbsolute.x,
        sourceInternal.internals.positionAbsolute.y,
        targetInternal.internals.positionAbsolute.x,
        targetInternal.internals.positionAbsolute.y,
      ] as const
    }, [source, target]),
    shallowEqual,
  )

  const isModified = isTruthy(data.controlPoints) || isControlPointDragging

  if (!isModified) {
    const originalBounds = data.tableNodeBounds ?? data.umlNodeBounds
    if (originalBounds) {
      const sourceBounds = {
        x: data.tableNodeBounds ? sourceLeft : sourceX - sourceNodeWidth / 2,
        y: data.tableNodeBounds ? sourceTop : sourceY - sourceNodeHeight / 2,
        width: sourceNodeWidth,
        height: sourceNodeHeight,
      }
      const targetBounds = {
        x: data.tableNodeBounds ? targetLeft : targetX - targetNodeWidth / 2,
        y: data.tableNodeBounds ? targetTop : targetY - targetNodeHeight / 2,
        width: targetNodeWidth,
        height: targetNodeHeight,
      }
      const [a, b, nextA, nextB] = data.dir === 'back'
        ? [originalBounds.target, originalBounds.source, targetBounds, sourceBounds]
        : [originalBounds.source, originalBounds.target, sourceBounds, targetBounds]
      return bezierPath(moveUmlSpline(data.points, a, b, nextA, nextB))
    }
    return bezierPath(data.points)
  }

  const sourceCenterPos = vector(sourceX, sourceY).trunc()
  const targetCenterPos = vector(targetX, targetY).trunc()

  const sourceNd = {
    // Calculate node top-left from center position
    ...sourceCenterPos
      .subtract(vector(sourceNodeWidth, sourceNodeHeight).divide(2))
      .trunc()
      .toObject(),
    width: sourceNodeWidth,
    height: sourceNodeHeight,
  }
  const targetNd = {
    // Calculate node top-left from center position
    ...targetCenterPos
      .subtract(vector(targetNodeWidth, targetNodeHeight).divide(2))
      .trunc()
      .toObject(),
    width: targetNodeWidth,
    height: targetNodeHeight,
  }

  const nodeMargin = 6
  const points = data.dir === 'back'
    ? [
      targetCenterPos,
      getNodeIntersectionFromCenterToPoint(targetNd, first(controlPoints) ?? sourceCenterPos, nodeMargin),
      ...controlPoints,
      getNodeIntersectionFromCenterToPoint(sourceNd, last(controlPoints) ?? targetCenterPos, nodeMargin),
      sourceCenterPos,
    ]
    : [
      sourceCenterPos,
      getNodeIntersectionFromCenterToPoint(sourceNd, first(controlPoints) ?? targetCenterPos, nodeMargin),
      ...controlPoints,
      getNodeIntersectionFromCenterToPoint(targetNd, last(controlPoints) ?? sourceCenterPos, nodeMargin),
      targetCenterPos,
    ]

  return nonNullable(curve(points))
}
