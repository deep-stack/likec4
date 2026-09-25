import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { Builder } from '../../packages/core/src/builder/Builder'
import { LikeC4Model } from '../../packages/core/src/model/LikeC4Model'
import { type ComputedEdge, type EdgeId, _stage } from '../../packages/core/src/types'
import { Graphviz } from '../../packages/layouts/node_modules/@hpcc-js/wasm-graphviz/dist/index.js'
import { parseGraphvizJson } from '../../packages/layouts/src/graphviz/GraphvizParser'

type Field = { name: string; type: string; key: string }
type Connection = { source: string; target: string; from: string; to: string }
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
const graphviz = await Graphviz.load()
const results = []
const fixtures = []
const header = 40, row = 36
const escape = (s: string) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
for (const fixture of cases) {
  const { builder, model: { model, table, rel }, views: { views, view, $include } } = Builder.forSpecification({
    elements: { table: { style: { color: 'green', shape: 'rectangle' } } },
  })
  const pairs = fixture.connections.filter((c, i, all) =>
    c.source !== c.target && all.findIndex(x => x.source === c.source && x.target === c.target) === i
  )
  const computed = builder.with(
    model(...Object.keys(fixture.tables).map(id => table(id)), ...pairs.map(c => rel(c.source, c.target))),
    views(
      view(
        fixture.id,
        fixture.id === 'webharvest' ? 'Webharvest records' : 'Relationship stress fixture',
        $include('*'),
      ),
    ),
  ).toLikeC4Model()
  const initial = computed.view(fixture.id).$view
  // Deliberately inject pair segments AFTER computation for this parser/viewer spike.
  // Production support must preserve these identities during view computation.
  const template = initial.edges[0]!
  const edges: ComputedEdge[] = fixture.connections.map((c: Connection, i) => ({
    ...template,
    id: `edge${i}` as EdgeId,
    source: initial.nodes.find(n => n.id === c.source)!.id,
    target: initial.nodes.find(n => n.id === c.target)!.id,
    label: null,
    line: 'solid',
    head: 'none',
  }))
  const computedView = { ...initial, edges }
  const names = Object.keys(fixture.tables)
  const widths = Object.fromEntries(
    names.map(name => [
      name,
      Math.max(320, ...fixture.tables[name]!.map(f => 78 + f.name.length * 8 + f.type.length * 8)),
    ]),
  )
  const dotNodes = names.map((name, i) => {
    const fields = fixture.tables[name]!
    const width = widths[name]!
    return `n${i} [likec4_id="${name}" label=<<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="0"><TR><TD WIDTH="${width}" HEIGHT="${header}" FIXEDSIZE="TRUE">${
      escape(name)
    }</TD></TR>${
      fields.map((f, index) =>
        `<TR><TD PORT="p${index}" WIDTH="${width}" HEIGHT="${row}" FIXEDSIZE="TRUE">${escape(f.name)}</TD></TR>`
      ).join('')
    }</TABLE>>];`
  })
  const dotEdges = fixture.connections.map((c, i) => {
    const from = fixture.tables[c.source]!.findIndex(f => f.name === c.from)
    const to = fixture.tables[c.target]!.findIndex(f => f.name === c.to)
    return `n${names.indexOf(c.source)}:p${from}:e -> n${names.indexOf(c.target)}:p${to}:${
      c.source === c.target ? 'e' : 'w'
    } [likec4_id="edge${i}" arrowhead=none arrowtail=none];`
  })
  const dot = `digraph {graph [rankdir=LR nodesep=0.6 ranksep=1.5]; node [shape=plain]; ${dotNodes.join('\n')} ${
    dotEdges.join('\n')
  }}`
  const raw = JSON.parse(graphviz.layout(dot, 'json', undefined, { yInvert: true }))
  const layout = parseGraphvizJson(raw, computedView)
  const checks = fixture.connections.map((c, i) => {
    const edge = layout.edges[i]!
    const source = layout.nodes.find(n => n.id === c.source)!
    const target = layout.nodes.find(n => n.id === c.target)!
    const start = edge.points[0]!, end = edge.points.at(-1)!
    const sy = source.y + header + fixture.tables[c.source]!.findIndex(f => f.name === c.from) * row + row / 2
    const ty = target.y + header + fixture.tables[c.target]!.findIndex(f => f.name === c.to) * row + row / 2
    assert.ok(Math.abs(start[1] - sy) <= 1, `source row ${fixture.id}/${i}: ${start[1]} != ${sy}`)
    assert.ok(Math.abs(end[1] - ty) <= 1, `target row ${fixture.id}/${i}: ${end[1]} != ${ty}`)
    assert.ok(Math.abs(start[0] - source.x - source.width) <= 1)
    assert.ok(Math.abs(end[0] - target.x - (c.source === c.target ? target.width : 0)) <= 1)
    return { edge: edge.id, source: c.from, target: c.to, start, end }
  })
  const layouted = LikeC4Model.create({ ...computed.$data, [_stage]: 'layouted', views: { [fixture.id]: layout } })
  const dump = layouted.$data
  const restored = LikeC4Model.fromDump(JSON.parse(JSON.stringify(dump)))
  assert.deepEqual(restored.view(fixture.id).$view.edges.map(e => e.points), layout.edges.map(e => e.points))
  fixtures.push({ id: fixture.id, tables: fixture.tables, connections: fixture.connections, dump })
  results.push({ id: fixture.id, nodes: layout.nodes.length, checks, savedModelRoundTrip: true })
}
writeFileSync(new URL('./fixtures.json', import.meta.url), JSON.stringify(fixtures, null, 2) + '\n')
writeFileSync(new URL('./parser-results.json', import.meta.url), JSON.stringify(results, null, 2) + '\n')
console.log(JSON.stringify(results, null, 2))
Graphviz.unload()
