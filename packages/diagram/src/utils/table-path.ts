import type { NonEmptyArray, NonEmptyReadonlyArray, Point } from '@likec4/core'

/** Move a field spline while retaining the tangents at both row endpoints. */
export function translateTablePath(
  points: NonEmptyReadonlyArray<Point>,
  source: { x: number; y: number },
  target: { x: number; y: number },
): NonEmptyArray<Point> {
  const move = ([x, y]: Point, index: number): Point => {
    const weight = Math.max(0, Math.min(1, (index - 1) / Math.max(1, points.length - 3)))
    return [x + source.x * (1 - weight) + target.x * weight, y + source.y * (1 - weight) + target.y * weight]
  }
  const [first, ...rest] = points
  return [move(first, 0), ...rest.map((point, index) => move(point, index + 1))]
}
