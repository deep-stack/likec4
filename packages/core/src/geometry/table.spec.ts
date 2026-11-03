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
  it('widens a table for its badges only when a field has one', () => {
    const fields = [{ id: 'email', title: 'customer_email_address_for_receipts', type: 'text' }]
    const plain = tableGeometry({ fields }, 'Customers')
    const badged = tableGeometry({ fields: [{ ...fields[0]!, badge: { text: 'health, special' } }] }, 'Customers')
    expect(plain.badgeWidth).toBe(0)
    expect(badged.badgeWidth).toBeGreaterThan(0)
    expect(badged.width).toBeGreaterThanOrEqual(plain.width + badged.badgeWidth)
  })
})
