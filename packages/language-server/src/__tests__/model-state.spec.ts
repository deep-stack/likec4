import { describe } from 'vitest'
import { testFileScope as test } from '../test'

const source = `specification { element step relationship transition }
model {
 running = step
 queued = step
 running -[transition]-> queued { transition { trigger 'error' guard 'retries left' effect 'back off' } }
}
views { view lifecycle { include * } }`

describe('state transitions', () => {
  test('parses trigger, guard and effect', async ({ t, expect }) => {
    await t.validate(source)
    const model = await t.buildModel()
    expect(Object.values(model.relations).map(r => r.stateTransition)).toEqual([
      { trigger: 'error', guard: 'retries left', effect: 'back off' },
    ])
  })

  test('accepts an empty transition block', async ({ t, expect }) => {
    const { errors } = await t.validate(source.replace(/transition \{ trigger[^}]*\}/, 'transition {}'))
    expect(errors).toEqual([])
    const model = await t.buildModel()
    expect(Object.values(model.relations).map(r => r.stateTransition)).toEqual([{}])
  })

  test('rejects a repeated part', async ({ t, expect }) => {
    const { formattedError } = await t.validate(source.replace('trigger \'error\'', 'trigger \'a\' trigger \'b\''))
    expect(formattedError).toContain('Duplicate transition trigger')
  })

  test('allows a self-transition', async ({ t, expect }) => {
    const { errors } = await t.validate(`specification { element step }
      model { running = step
        running -> running { transition { trigger 'heartbeat' } } }`)
    expect(errors).toEqual([])
  })

  test('still accepts the new keywords as names', async ({ t, expect }) => {
    const { errors } = await t.validate(`specification {
        element state element transition element trigger element guard element effect
        relationship transition }
      model {
        transition = state
        trigger = transition
        guard = trigger
        effect = guard
        trigger -[transition]-> effect 'calls'
      }`)
    expect(errors).toEqual([])
  })

  test('accepts the state shapes and still accepts their names as identifiers', async ({ t, expect }) => {
    const { errors } = await t.validate(`specification {
        element initial { style { shape initial } }
        element final { style { shape final } }
        element state { style { shape state } } }
      model {
        initial = initial
        state = state
        final = final
        initial -> state
        state -> final
      }`)
    expect(errors).toEqual([])
  })
})
