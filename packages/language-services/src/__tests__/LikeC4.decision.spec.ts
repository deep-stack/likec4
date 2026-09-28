import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { fromSource } from '../node/index'

const parallelBranches = `specification { element step }
model {
 question = step 'Is the request valid?'
 result = step 'Review request'
 question -> result { branch 'Yes' }
 question -> result { branch 'No' }
}
views { view decision { include * } }`

it('keeps parallel decision branches and their labels in the computed view', async () => {
  const likec4 = await fromSource(parallelBranches, { throwIfInvalid: true })
  try {
    const relations = Object.values((await likec4.parsedModel()).$data.relations)
    expect(relations.map(r => r.decisionBranch?.label).sort()).toEqual(['No', 'Yes'])
    const edges = (await likec4.computedModel()).view('decision').$view.edges
    expect(edges).toHaveLength(2)
    expect(edges.map(e => e.label).sort()).toEqual(['No', 'Yes'])
  } finally {
    await likec4.dispose()
  }
})

it('accepts a semicolon after a branch label', async () => {
  const likec4 = await fromSource(parallelBranches.replace('branch \'Yes\'', 'branch \'Yes\';'), {
    throwIfInvalid: true,
  })
  try {
    const edges = (await likec4.computedModel()).view('decision').$view.edges
    expect(edges.map(edge => edge.label).sort()).toEqual(['No', 'Yes'])
  } finally {
    await likec4.dispose()
  }
})

it('retains a quoted branch label when exporting and reloading DSL', async () => {
  const first = await fromSource(parallelBranches.replace('branch \'Yes\'', 'branch "Needs \\"review\\""'), {
    throwIfInvalid: true,
  })
  try {
    const exported = await first.toDSL()
    expect(exported).toContain('branch')
    const second = await fromSource(exported, { throwIfInvalid: true })
    try {
      const labels = Object.values((await second.parsedModel()).$data.relations)
        .map(r => r.decisionBranch?.label).sort()
      expect(labels).toEqual(['Needs "review"', 'No'])
    } finally {
      await second.dispose()
    }
  } finally {
    await first.dispose()
  }
})

it('accepts diamond questions and pill actions in the same view', async () => {
  const source = `specification {
    element question { style { shape diamond } }
    element action { style { shape pill } }
  }
  model {
    impact = question 'Impacting deliverables?'
    continue = action 'Continue with current migration'
    impact -> continue { branch 'No' }
  }
  views { view scenario { include * autoLayout TopBottom } }`
  const likec4 = await fromSource(source, { throwIfInvalid: true })
  try {
    const nodes = (await likec4.layoutedModel()).view('scenario').$view.nodes
    expect(nodes.find(node => node.id === 'impact')?.shape).toBe('diamond')
    expect(nodes.find(node => node.id === 'continue')?.shape).toBe('pill')
  } finally {
    await likec4.dispose()
  }
})

it('compiles the supplied decision scenario into six nodes and five distinct paths', async () => {
  const source = readFileSync(new URL('../../../../examples/decision-flowchart/scenario.c4', import.meta.url), 'utf8')
  const likec4 = await fromSource(source, { throwIfInvalid: true })
  try {
    const view = (await likec4.layoutedModel()).view('scenario').$view
    expect(view.nodes).toHaveLength(6)
    expect(view.edges).toHaveLength(5)
    expect(view.edges.map(edge => edge.decisionBranch?.label).filter(Boolean).sort()).toEqual([
      'No',
      'No',
      'Yes',
      'Yes',
    ])
    expect(view.nodes.filter(node => node.shape === 'diamond')).toHaveLength(2)
  } finally {
    await likec4.dispose()
  }
})

it('lays out a decision self-loop and preserves it through DSL round trips', async () => {
  const source = `specification { element question { style { shape diamond } } element action }
  model { check = question done = action
    check -> check { branch 'Retry' }
    check -> done { branch 'Continue' }
  }
  views { view retry { include * } }`
  const first = await fromSource(source, { throwIfInvalid: true })
  try {
    const second = await fromSource(await first.toDSL(), { throwIfInvalid: true })
    try {
      const view = (await second.layoutedModel()).view('retry').$view
      expect(view.edges).toHaveLength(2)
      const loop = view.edges.find(edge => edge.source === edge.target)
      expect(loop?.decisionBranch).toEqual({ label: 'Retry' })
      expect(loop?.label).toBe('Retry')
      expect(loop?.points.length).toBeGreaterThan(3)
      expect(loop?.parent).toBeNull()
    } finally {
      await second.dispose()
    }
  } finally {
    await first.dispose()
  }
})
