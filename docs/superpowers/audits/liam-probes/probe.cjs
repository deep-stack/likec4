// oxlint-disable import/no-commonjs -- standalone audit probes load CommonJS tools
const fs = require('node:fs'), path = require('node:path')
const esbuild = require(
  '/home/deepstack/.cache/ngin8r/compilers/23c847269e387299c715b2d125ffbb098be76f77c7c381b6c29a607ae887c173/node_modules/esbuild',
)
const liam = '/home/deepstack/Desktop/Deepstack/liam'
const erd = path.join(liam, 'frontend/packages/erd-core/src')
const schema = path.join(liam, 'frontend/packages/schema/src')
const deps = '/home/deepstack/Desktop/Deepstack/webharvest/.ngin8r/comparisons/auth-er-liam-v1/node_modules'
;(async () => {
  const report = { liamCommit: 'c89f31d45', checks: {} }
  const exportsBuild = await esbuild.build({
    entryPoints: [erd + '/index.ts'],
    bundle: true,
    write: false,
    metafile: true,
    format: 'esm',
    platform: 'neutral',
    packages: 'external',
    outfile: '/tmp/liam-export-audit.js',
    loader: { '.css': 'empty', '.module.css': 'empty', '.png': 'dataurl' },
    logLevel: 'silent',
  })
  const names = Object.values(exportsBuild.metafile.outputs)[0].exports
  report.checks.publicExports = Object.fromEntries(
    [
      'ERDRenderer',
      'ERDContent',
      'ErdRendererProvider',
      'TableNode',
      'TableColumn',
      'RelationshipEdge',
      'highlightNodesAndEdges',
      'convertSchemaToNodes',
      'computeAutoLayout',
    ].map(n => [n, names.includes(n)]),
  )
  const { code: highlight } = await esbuild.transform(
    fs.readFileSync(erd + '/features/erd/utils/highlightNodesAndEdges.ts', 'utf8'),
    { loader: 'ts', format: 'cjs' },
  )
  const mod = { exports: {} }
  new Function('module', 'exports', 'require', highlight)(
    mod,
    mod.exports,
    id =>
      id === '../constants'
        ? { zIndex: { edgeHighlighted: 1, edgeDefault: 0 } }
        : { isTableNode: n => n.type === 'table' },
  )
  const node = id => ({ id, type: 'table', data: { table: { name: id } } })
  const nodes = ['a', 'b', 'c', 'd'].map(node),
    edges = [{ id: 'ab', source: 'a', target: 'b' }, { id: 'ac', source: 'a', target: 'c' }, {
      id: 'bc',
      source: 'b',
      target: 'c',
    }]
  const h = mod.exports.highlightNodesAndEdges(nodes, edges, { hoverTableName: 'a' })
  report.checks.hover = {
    nodes: h.nodes.filter(n => n.data.isHighlighted).map(n => n.id),
    edges: h.edges.filter(e => e.data.isHighlighted).map(e => e.id),
    method: 'Unmodified helper transpiled; constants and type guard supplied equivalently.',
  }
  const result = await esbuild.build({
    stdin: {
      contents: `export { constraintsToRelationships } from '${schema}/utils/constraintsToRelationships.ts'`,
      resolveDir: liam,
      loader: 'ts',
    },
    bundle: true,
    write: false,
    format: 'cjs',
    platform: 'node',
    nodePaths: [deps],
    logLevel: 'silent',
  })
  const sm = { exports: {} }
  new Function('module', 'exports', 'require', result.outputFiles[0].text)(sm, sm.exports, require)
  const fk = {
    type: 'FOREIGN KEY',
    name: 'fk',
    columnNames: ['parent_id'],
    targetTableName: 'parent',
    targetColumnNames: ['id'],
    updateConstraint: 'NO_ACTION',
    deleteConstraint: 'NO_ACTION',
  }
  const base = {
    parent: { name: 'parent', columns: {}, constraints: {} },
    child: {
      name: 'child',
      columns: {},
      constraints: { fk, uniq: { type: 'UNIQUE', name: 'uniq', columnNames: ['parent_id', 'other'] } },
    },
  }
  report.checks.supersetUnique = {
    actual: Object.values(sm.exports.constraintsToRelationships(base))[0].cardinality,
    expected: 'ONE_TO_MANY',
    reason: 'UNIQUE(parent_id, other) does not make parent_id unique.',
  }
  base.child.constraints = { fk: { ...fk, columnNames: ['parent_id', 'tenant_id'], targetColumnNames: ['id'] } }
  report.checks.mismatchedPairs = {
    actualRelationships: Object.keys(sm.exports.constraintsToRelationships(base)).length,
    expected: 'reject invalid unequal column-pair lengths',
  }
  const source = fs.readFileSync(erd + '/features/erd/utils/convertSchemaToNodes.ts', 'utf8')
  const { code: converted } = await esbuild.transform(source, { loader: 'ts', format: 'cjs' })
  const cm = { exports: {} }
  new Function('module', 'exports', 'require', converted)(
    cm,
    cm.exports,
    id =>
      id === '@liam-hq/schema'
        ? sm.exports
        : id === '../constants'
        ? { NON_RELATED_TABLE_GROUP_NODE_ID: 'non-related-table-group', zIndex: { nodeDefault: 2 } }
        : { columnHandleId: (t, c) => `${t}-${c}` },
  )
  base.child.constraints = {
    fk: { ...fk, columnNames: ['parent_id', 'tenant_id'], targetColumnNames: ['id', 'tenant_id'] },
  }
  const convertedGraph = cm.exports.convertSchemaToNodes({ schema: { tables: base }, showMode: 'ALL_FIELDS' })
  report.checks.compositeSourceHandles = {
    sourceColumnName: convertedGraph.nodes.find(n => n.id === 'parent').data.sourceColumnName,
    edgeSourceHandles: convertedGraph.edges.map(e => e.sourceHandle),
    reason:
      'Renderer creates a source row handle only when sourceColumnName equals that row; only the last referenced column is retained.',
  }
  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
})().catch(e => {
  console.error(e.message)
  process.exit(1)
})
