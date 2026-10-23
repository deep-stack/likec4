// Copied into an isolated npm consumer by smoke-fork-release.mjs.
import { LikeC4Model } from '@likec4/core/model'
import { generateMermaid } from '@likec4/generators'
import { build } from 'esbuild'
import { LikeC4 } from 'likec4'
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { chromium } from 'playwright'

const architecture = `
specification { element service }
model {
  client = service 'Client'
  api = service 'API'
  client -> api 'Sends request'
}
views {
  view overview { include * }
  dynamic view request { client -> api }
}`
const models = []
for (const source of [architecture, await readFile('er.c4', 'utf8')]) {
  const instance = await LikeC4.fromSource(source, { throwIfInvalid: true, graphviz: 'wasm', logger: false })
  try {
    models.push((await instance.layoutedModel()).$data)
  } finally {
    await instance.dispose()
  }
}
const schemaView = Object.values(models[1].views).find(view => view.nodes.some(node => node.table))
assert(schemaView, 'Packed compiler must preserve native ER table data')
assert(Object.values(models[1].elements).some(element => element.table?.fields.length))
assert.match(generateMermaid(LikeC4Model.fromDump(models[0]).view('overview')), /Client/)
assert.throws(
  () => generateMermaid(LikeC4Model.fromDump(models[1]).view(schemaView.id)),
  /ER table export is not supported/,
)
await writeFile('models.json', JSON.stringify(models))
await writeFile(
  'viewer.jsx',
  `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {LikeC4Model} from '@likec4/core/model';
import {LikeC4ModelProvider, ReactLikeC4} from 'likec4/react';
import models from './models.json';
// The first viewer uses the embedding options; the second keeps the defaults. The last two show the
// first's view as sequences, so two walkthroughs run on one page.
const embedding = {showLogo: false, navigationLabel: 'Interaction diagram',
  reactFlowProps: {proOptions: {hideAttribution: true}}};
const viewers = [[0, 'request', embedding], [1, ${JSON.stringify(schemaView.id)}, {}],
  [0, 'request', {dynamicViewVariant: 'sequence'}], [0, 'request', {dynamicViewVariant: 'sequence'}]];
for (const [index, [model, viewId, options]] of viewers.entries()) {
  // Several roots on one page need their own id prefixes, as React requires.
  createRoot(document.getElementById('diagram-' + index), {identifierPrefix: 'diagram-' + index + '-'}).render(
    <LikeC4ModelProvider likec4model={LikeC4Model.fromDump(models[model])}>
      <ReactLikeC4 viewId={viewId} style={{width:'100%',height:600}}
        injectFontCss={false} fitView enableDynamicViewWalkthrough {...options} />
    </LikeC4ModelProvider>
  );
}`,
)
await build({
  entryPoints: ['viewer.jsx'],
  outfile: 'viewer.js',
  bundle: true,
  platform: 'browser',
  define: { 'process.env.NODE_ENV': '"production"' },
})
const server = createServer(async (req, res) => {
  if (req.url === '/viewer.js') {
    res.setHeader('Content-Type', 'text/javascript')
    res.end(await readFile('viewer.js'))
  } else {
    res.setHeader('Content-Type', 'text/html')
    res.end(
      '<!doctype html><div id="diagram-0"></div><div id="diagram-1"></div><div id="diagram-2"></div><div id="diagram-3"></div><script src="/viewer.js"></script>',
    )
  }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
let browser
try {
  browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
  const page = await browser.newPage({ viewport: { width: 1400, height: 1400 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  await page.locator('#diagram-0 .react-flow__node').first().waitFor()
  await page.locator('#diagram-1 .likec4-table').first().waitFor()
  assert.equal(await page.locator('#diagram-0 .react-flow__node').count(), 2)
  assert.equal(
    await page.locator('#diagram-1 .likec4-table').count(),
    schemaView.nodes.filter(node => node.table).length,
  )
  await page.locator('#diagram-1 [role="group"][aria-label^="Table "]').first().focus()
  // Read-only tables cannot be moved, so there is no position reset; without previews, no expansion toggle either.
  assert.equal(await page.locator('#diagram-1 [aria-label="Reset table positions"]').count(), 0)
  assert.equal(await page.locator('#diagram-1 .likec4-table-controls').count(), 0)
  // Logo, navigation label and React Flow attribution follow the embedding options.
  const logo = 'path[fill="#5E98AF"]'
  assert.equal(await page.locator(`#diagram-0 ${logo}`).count(), 0)
  assert(await page.locator(`#diagram-1 ${logo}`).count() > 0, 'Logo must remain visible by default')
  await page.locator('#diagram-0').getByText('Interaction diagram', { exact: true }).waitFor()
  assert.equal(await page.locator('#diagram-0 .react-flow__attribution').count(), 0)
  assert.equal(await page.locator('#diagram-1 .react-flow__attribution').count(), 1)
  // Each running walkthrough keeps its own highlights: the outline's active step shares one animation
  // id in every diagram, so starting the second must not hide the first's.
  for (const diagram of ['#diagram-2', '#diagram-3']) {
    await page.locator(diagram).getByRole('button', { name: 'Start', exact: true }).click()
    // The step's label on the diagram, then its badge in the outline.
    await page.locator(diagram).getByText('1', { exact: true }).nth(1).waitFor()
  }
  const firstStep = page.locator('#diagram-2').getByText('1', { exact: true })
  assert.equal(await firstStep.count(), 2, 'The step label and its outline badge')
  for (let check = 0; check < 10; check++) {
    for (const step of await firstStep.all()) {
      assert(await step.isVisible(), 'A walkthrough must not hide another diagram\'s active step')
    }
    await page.waitForTimeout(100)
  }
  assert.deepEqual(errors, [], 'Packed viewer must render without browser errors')
  console.log(
    'Packed compiler, model API, Mermaid export, dynamic viewer, native ER viewer, embedding options and independent walkthroughs passed',
  )
} finally {
  await browser?.close()
  await new Promise(resolve => server.close(resolve))
}
