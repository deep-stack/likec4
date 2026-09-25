import assert from 'node:assert/strict'
import { test } from 'node:test'
import { movePoints } from './move-points'
const points = [[10, 20], [40, 20], [70, 80], [100, 80]] as const

test('moving one endpoint retains row position and tangent at both ends', () => {
  assert.deepEqual(movePoints(points, { x: 25, y: 40 }, { x: 0, y: 0 }), [[35, 60], [65, 60], [70, 80], [100, 80]])
})
test('moving both ends translates the entire curve, including a self-loop', () => {
  assert.deepEqual(movePoints(points, { x: 25, y: 40 }, { x: 25, y: 40 }), points.map(([x, y]) => [x + 25, y + 40]))
})
test('long splines preserve their shape when nothing moves', () => {
  const multi = [...points, [120, 80], [150, 100], [180, 100]] as const
  assert.deepEqual(movePoints(multi, { x: 0, y: 0 }, { x: 0, y: 0 }), multi)
})
