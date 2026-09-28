import { readFileSync, writeFileSync } from 'node:fs'
import { fromSource } from '../../packages/language-services/src/node/index'
const instance = await fromSource(readFileSync(new URL('./model.c4', import.meta.url), 'utf8'), {
  throwIfInvalid: true,
})
try {
  const model = await instance.layoutedModel()
  writeFileSync(new URL('./fixture.json', import.meta.url), JSON.stringify(model.$data))
} finally {
  await instance.dispose()
}
