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
