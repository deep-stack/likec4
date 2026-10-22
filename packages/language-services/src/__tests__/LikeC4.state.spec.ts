import { expect, it } from 'vitest'
import { fromSource } from '../node/index'

const transitions = `specification { element step relationship transition }
model {
 running = step 'Running'
 queued = step 'Queued'
 running -[transition]-> queued { transition { trigger "fail \\"hard\\"" guard 'it\\'s retried' effect 'back\\\\off' } }
 running -[transition]-> running { transition { trigger 'heartbeat' effect 'extend lease' } }
}
views { view lifecycle { include * } }`

it('retains quoted transition parts and self-transitions when exporting and reloading DSL', async () => {
  const first = await fromSource(transitions, { throwIfInvalid: true })
  try {
    const exported = await first.toDSL()
    expect(exported).toContain('transition {')
    const second = await fromSource(exported, { throwIfInvalid: true })
    try {
      const parts = Object.values((await second.parsedModel()).$data.relations).map(r => r.stateTransition)
      expect(parts).toEqual(expect.arrayContaining([
        { trigger: 'fail "hard"', guard: 'it\'s retried', effect: 'back\\off' },
        { trigger: 'heartbeat', effect: 'extend lease' },
      ]))
      const view = (await second.layoutedModel()).view('lifecycle').$view
      const loop = view.edges.find(edge => edge.source === edge.target)
      expect(loop?.label).toBe('heartbeat / extend lease')
      expect(loop?.points.length).toBeGreaterThan(3)
    } finally {
      await second.dispose()
    }
  } finally {
    await first.dispose()
  }
})
