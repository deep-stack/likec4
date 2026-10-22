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

const stateSpec = `specification {
  element initial { style { shape initial } }
  element final { style { shape final } }
  element state { style { shape state } }
  element box
}`

describe('state warnings', () => {
  test('warns about an initial state with incoming transitions', async ({ t, expect }) => {
    const result = await t.validate(`${stateSpec}
      model { start = initial a = state
        start -> a
        a -> start { transition { trigger 'reset' } } }`)
    expect(result.errors).toEqual([])
    expect(result.warnings).toContain('An initial state cannot have incoming transitions')
  })

  test('warns about an initial state with more than one way out', async ({ t, expect }) => {
    const result = await t.validate(`${stateSpec}
      model { start = initial a = state b = state
        start -> a
        start -> b }`)
    expect(result.errors).toEqual([])
    expect(result.warnings).toContain('An initial state has exactly one outgoing transition')
  })

  test('warns about a trigger or guard on the way out of an initial state', async ({ t, expect }) => {
    const result = await t.validate(`${stateSpec}
      model { start = initial a = state
        start -> a { transition { guard 'ready' } } }`)
    expect(result.warnings).toContain('The transition from an initial state has no trigger or guard')
  })

  test('warns about a final state with outgoing transitions', async ({ t, expect }) => {
    const result = await t.validate(`${stateSpec}
      model { a = state end = final
        a -> end
        end -> a { transition { trigger 'restart' } } }`)
    expect(result.errors).toEqual([])
    expect(result.warnings).toContain('A final state cannot have outgoing transitions')
  })

  test('warns about an unnamed transition between two states', async ({ t, expect }) => {
    const result = await t.validate(`${stateSpec}
      model { a = state b = state
        a -> b }`)
    expect(result.errors).toEqual([])
    expect(result.warnings).toContain('Name the trigger, guard or effect of this transition')
  })

  test('accepts a well-formed lifecycle without warnings', async ({ t, expect }) => {
    const result = await t.validate(`${stateSpec}
      model { start = initial queued = state running = state done = state end = final
        start -> queued
        queued -> running { transition { trigger 'worker starts' } }
        running -> running { transition { trigger 'heartbeat' effect 'extend lease' } }
        running -> queued 'error'
        running -> done { transition { trigger 'capture saved' } }
        done -> end }`)
    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
  })

  test('does not apply state warnings to ordinary elements', async ({ t, expect }) => {
    const result = await t.validate(`${stateSpec}
      model { a = box b = box
        a -> b
        b -> a }`)
    expect(result.warnings).toEqual([])
  })
})
