import { describe } from 'vitest'
import { testFileScope as test } from '../test'

const source = `specification { element record }
model {
 requests = record { style { shape table } table { column id 'text' { primaryKey } column tenant 'uuid' { unique } } }
 attempts = record { style { shape table } table { column id 'bigint' { primaryKey } column request_id 'text' { nullable false } } }
 requests -> attempts { tableRelation { pair id -> request_id sourceCardinality one targetCardinality zeroOrMany } }
}
views { view records { include * } }`
describe('ER table data', () => {
  test('parses fields and explicit endpoint cardinality', async ({ t, expect }) => {
    const { formattedError } = await t.validate(source)
    expect(formattedError).toBe('')
    const model = await t.buildModel()
    expect(model.elements['requests']?.table?.fields).toEqual([
      { id: 'id', title: 'id', type: 'text', keys: ['primary'] },
      { id: 'tenant', title: 'tenant', type: 'uuid', keys: ['unique'] },
    ])
    expect(Object.values(model.relations)[0]?.tableRelation).toEqual({
      pairs: [{ source: 'id', target: 'request_id' }],
      sourceCardinality: { min: 1, max: 1 },
      targetCardinality: { min: 0, max: 'many' },
    })
  })
  for (
    const [name, input, diagnostic] of [
      ['duplicate field', source.replace('column tenant \'uuid\'', 'column id \'uuid\''), 'Duplicate table field'],
      ['missing field', source.replace('pair id ->', 'pair missing ->'), 'Unknown source table field'],
      ['empty pairs', source.replace('pair id -> request_id', ''), 'At least one field pair'],
      ['wrong shape', source.replaceAll('shape table', 'shape rectangle'), 'Table data requires shape table'],
    ]
  ) {
    test(`rejects ${name}`, async ({ t, expect }) => {
      const { formattedError } = await t.validate(input!)
      expect(formattedError).toContain(diagnostic!)
    })
  }
  test('accepts a field self-reference with unknown cardinality', async ({ t, expect }) => {
    const { formattedError } = await t.validate(source.replace('requests -> attempts', 'attempts -> attempts'))
    expect(formattedError).toBe('')
  })
})

test('preserves parallel field mappings and a self-reference in computed views', async ({ t, expect }) => {
  const input = source.replace(
    '\n}',
    `
 requests -> attempts { tableRelation { pair tenant -> id } }
 attempts -> attempts { tableRelation { pair id -> request_id } }
}`,
  )
  const { formattedError } = await t.validate(input)
  expect(formattedError).toBe('')
  const model = await t.buildModel()
  const view = model.views['records']!
  expect(view.nodes.find(n => n.id === 'requests')?.table?.fields).toHaveLength(2)
  expect(view.edges).toHaveLength(3)
  expect(view.edges.map(e => e.tableRelation?.pairs)).toEqual(expect.arrayContaining([
    [{ source: 'id', target: 'request_id' }],
    [{ source: 'tenant', target: 'id' }],
  ]))
})

test('keeps existing type and key element names valid', async ({ t, expect }) => {
  const { formattedError } = await t.validate(`specification { element record }
model { type = record key = record type -> key }
views { view index { include * } }`)
  expect(formattedError).toBe('')
})
