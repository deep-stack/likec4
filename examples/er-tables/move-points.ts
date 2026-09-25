/** Move a saved spline with its row endpoints while retaining endpoint tangents. */
export function movePoints(
  points: readonly (readonly [number, number])[],
  source: { x: number; y: number },
  target: { x: number; y: number },
): [number, number][] {
  return points.map(([x, y], index) => {
    const weight = Math.max(0, Math.min(1, (index - 1) / (points.length - 3)))
    return [x + source.x * (1 - weight) + target.x * weight, y + source.y * (1 - weight) + target.y * weight]
  })
}
