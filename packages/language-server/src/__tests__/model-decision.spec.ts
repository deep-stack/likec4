import { describe } from 'vitest'
import { testFileScope as test } from '../test'

const source = `specification { element step }
model {
 question = step
 result = step
 question -> result { branch 'Yes' }
}
views { view decision { include * } }`

describe('decision branches', () => {
  test('rejects an empty label', async ({ t, expect }) => {
    const { formattedError } = await t.validate(source.replace('branch \'Yes\'', 'branch \'  \''))
    expect(formattedError).toContain('Branch label must not be empty')
  })

  test('rejects duplicate branch properties', async ({ t, expect }) => {
    const { formattedError } = await t.validate(source.replace('branch \'Yes\'', 'branch \'Yes\' branch \'No\''))
    expect(formattedError).toContain('Duplicate branch label')
  })
})

const flowSpec = `specification { element question { style { shape diamond } } element step }`

describe('decision flow warnings', () => {
  test('warns about missing and duplicate answers without rejecting the model', async ({ t, expect }) => {
    const result = await t.validate(`${flowSpec}
      model { check = question a = step b = step c = step
        check -> a { branch 'Yes' }
        check -> b { branch ' Yes ' }
        check -> c
      }`)
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining('Duplicate outgoing branch label'),
      expect.stringContaining('Missing branch label'),
    ]))
  })
  test('warns about a dead-end diamond connected to a decision flow', async ({ t, expect }) => {
    const result = await t.validate(`${flowSpec}
      model { check = question stuck = question done = step
        check -> stuck { branch 'Yes' }
        check -> done { branch 'No' }
      }`)
    expect(result.errors).toEqual([])
    expect(result.warnings).toContain('Decision has no outgoing paths')
  })
  test('warns about a decision with only one answer', async ({ t, expect }) => {
    const result = await t.validate(`${flowSpec}
      model { check = question done = step check -> done { branch 'Yes' } }`)
    expect(result.errors).toEqual([])
    expect(result.warnings).toContain('Decision has only one outgoing path')
  })
  test('allows multiway decisions and parallel destinations', async ({ t, expect }) => {
    const result = await t.validate(`${flowSpec}
      model { check = question done = step
        check -> done { branch 'Approve' }
        check -> done { branch 'Reject' }
        check -> done { branch 'Defer' }
      }`)
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
  })
  test('does not apply flow warnings to ordinary diamonds without branch opt-in', async ({ t, expect }) => {
    const result = await t.validate(`${flowSpec}
      model { isolated = question other = question done = step other -> done }`)
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
  })
  test('finds outgoing branches declared in another document', async ({ t, expect }) => {
    await t.addDocument(`${flowSpec} model { check = question a = step b = step }`, 'nodes.c4')
    await t.addDocument(`model { check -> a { branch 'Yes' } check -> b { branch 'Yes' } }`, 'paths.c4')
    const result = await t.validateAll()
    expect(result.errors).toEqual([])
    expect(result.warnings).toContain('Duplicate outgoing branch label: Yes')
  })
})

test('refreshes decision warnings when a separate branch document is removed', async ({ t, expect }) => {
  const nodes = await t.addDocument(`${flowSpec} model { check = question a = step b = step }`, 'nodes.c4')
  const paths = await t.addDocument(`model { check -> a { branch 'Yes' } check -> b { branch 'Yes' } }`, 'paths.c4')
  expect((await t.validateAll()).warnings).toContain('Duplicate outgoing branch label: Yes')
  await t.removeDocument(paths)
  expect(nodes.diagnostics?.map(d => d.message) ?? []).toEqual([])
})
