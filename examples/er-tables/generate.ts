import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { fromSource } from '../../packages/language-services/src/node/index'

type Field = { name: string; type: string; key: string }
const baseline = JSON.parse(readFileSync(new URL('./schema.json', import.meta.url), 'utf8')) as {
  tables: Record<string, Field[]>
}
const stress: Record<string, Field[]> = {
  accounts: [
    { name: 'id', type: 'uuid', key: 'PK' },
    { name: 'tenant_id', type: 'uuid', key: 'PK' },
    { name: 'manager_id', type: 'uuid', key: 'FK' },
    { name: 'a_long_field_name_that_must_remain_readable', type: 'varchar(255)', key: '' },
  ],
  assignments: [
    { name: 'id', type: 'uuid', key: 'PK' },
    { name: 'owner_id', type: 'uuid', key: 'FK' },
    { name: 'reviewer_id', type: 'uuid', key: 'FK' },
    { name: 'tenant_id', type: 'uuid', key: 'FK' },
  ],
  audit_log: [
    { name: 'id', type: 'bigint', key: 'PK' },
    { name: 'account_id', type: 'uuid', key: 'FK' },
    { name: 'assignment_id', type: 'uuid', key: 'FK' },
  ],
  disconnected: [{ name: 'id', type: 'uuid', key: 'PK' }],
}
const cases = [
  {
    id: 'webharvest',
    tables: baseline.tables,
    connections: [
      { source: 'scrape_request', target: 'scrape_attempt', from: 'id', to: 'request_id' },
    ],
  },
  {
    id: 'stress',
    tables: stress,
    connections: [
      { source: 'accounts', target: 'assignments', from: 'id', to: 'owner_id' },
      { source: 'accounts', target: 'assignments', from: 'id', to: 'reviewer_id' },
      { source: 'accounts', target: 'assignments', from: 'tenant_id', to: 'tenant_id' },
      { source: 'accounts', target: 'accounts', from: 'id', to: 'manager_id' },
      { source: 'accounts', target: 'audit_log', from: 'id', to: 'account_id' },
      { source: 'assignments', target: 'audit_log', from: 'id', to: 'assignment_id' },
    ],
  },
]
const fixtures = []
for (const fixture of cases) {
  const quote = (text: string) => JSON.stringify(text)
  const source = `specification { element record { style { shape table color green } } }
model {
${
    Object.entries(fixture.tables).map(([name, fields]) =>
      `${name} = record { table {
${
        fields.map(field =>
          `column ${field.name} ${quote(field.type)}${
            field.key === 'PK' ? ' { primaryKey }' : field.key === 'UK' ? ' { unique }' : ''
          }`
        ).join('\n')
      }
} }`
    ).join('\n')
  }
${
    fixture.connections.map(c =>
      `${c.source} -> ${c.target} { tableRelation { pair ${c.from} -> ${c.to} sourceCardinality one targetCardinality zeroOrMany } }`
    ).join('\n')
  }
}
views { view ${fixture.id} { title ${
    quote(fixture.id === 'webharvest' ? 'Webharvest records' : 'Relationship stress fixture')
  } include ${Object.keys(fixture.tables).join(', ')} autoLayout LeftRight } }`
  writeFileSync(
    new URL(`./${fixture.id}.c4`, import.meta.url),
    (fixture.id === 'stress' ? source.slice(source.indexOf('\n') + 1) : source) + '\n',
  )
  const instance = await fromSource(source, { throwIfInvalid: true })
  try {
    const model = await instance.layoutedModel()
    const view = model.view(fixture.id).$view
    assert.equal(view.nodes.length, Object.keys(fixture.tables).length)
    assert.equal(view.edges.length, fixture.connections.length)
    assert.ok(view.edges.every(edge => edge.tablePaths?.length === edge.tableRelation?.pairs.length))
    fixtures.push({ id: fixture.id, tables: fixture.tables, connections: fixture.connections, dump: model.$data })
  } finally {
    await instance.dispose()
  }
}
writeFileSync(new URL('./fixtures.json', import.meta.url), JSON.stringify(fixtures, null, 2) + '\n')
console.log('Native DSL compiler generated', fixtures.map(f => f.id).join(', '))
