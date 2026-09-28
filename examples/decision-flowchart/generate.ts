import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { fromSource } from '../../packages/language-services/src/node/index'

const source = readFileSync(new URL('./scenario.c4', import.meta.url), 'utf8')
const likec4 = await fromSource(source, { throwIfInvalid: true })
try {
  const model = await likec4.layoutedModel()
  const scenario = model.view('scenario').$view
  assert.equal(scenario.nodes.length, 6)
  assert.equal(scenario.edges.length, 5)
  assert.equal(scenario.nodes.filter(node => node.shape === 'diamond').length, 2)
  assert.deepEqual(scenario.edges.map(edge => edge.decisionBranch?.label).filter(Boolean).sort(), [
    'No',
    'No',
    'Yes',
    'Yes',
  ])
  writeFileSync(new URL('./model.json', import.meta.url), JSON.stringify(model.$data, null, 2) + '\n')
  console.log('Generated native decision flowchart')
} finally {
  await likec4.dispose()
}
