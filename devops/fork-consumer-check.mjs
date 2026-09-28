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
for (const [index, viewId] of [[0, 'request'], [1, ${JSON.stringify(schemaView.id)}]]) {
  createRoot(document.getElementById('diagram-' + index)).render(
    <LikeC4ModelProvider likec4model={LikeC4Model.fromDump(models[index])}>
      <ReactLikeC4 viewId={viewId} style={{width:'100%',height:600}}
        injectFontCss={false} fitView enableDynamicViewWalkthrough />
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
    res.end('<!doctype html><div id="diagram-0"></div><div id="diagram-1"></div><script src="/viewer.js"></script>')
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
  assert.deepEqual(errors, [], 'Packed viewer must render without browser errors')
  console.log('Packed compiler, model API, Mermaid export, dynamic viewer and native ER viewer passed')
} finally {
  await browser?.close()
  await new Promise(resolve => server.close(resolve))
}
