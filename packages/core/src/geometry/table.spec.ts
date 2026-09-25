import { describe, expect, it } from 'vitest'
import { tableGeometry } from './table'

describe('table geometry', () => {
  it('uses stable row ports independent of field spelling', () => {
    const geometry = tableGeometry({
      fields: [
        { id: 'id', title: 'Identifier', type: 'uuid' },
        { id: 'owner', title: 'Owner', type: 'uuid' },
      ],
    }, 'Tasks')
    expect(geometry.height).toBe(112)
    expect(geometry.rows.map(row => [row.port, row.y + row.height / 2])).toEqual([
      ['field0', 58],
      ['field1', 94],
    ])
  })
})
