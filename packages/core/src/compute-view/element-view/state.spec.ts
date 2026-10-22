import { describe, expect, it } from 'vitest'
import { Builder } from '../../builder'
import { stateTransitionLabel, stateTransitionLabelParts } from '../../types/state'

describe('stateTransitionLabel', () => {
  it('joins trigger, guard and effect', () => {
    expect(stateTransitionLabel({ trigger: 'error', guard: 'retries left', effect: 'back off' }))
      .toBe('error [retries left] / back off')
  })

  it('leaves out missing and blank parts', () => {
    expect(stateTransitionLabel({ guard: 'g' })).toBe('[g]')
    expect(stateTransitionLabel({ effect: ' e ' })).toBe('/ e')
    expect(stateTransitionLabel({ trigger: '  ', guard: 'g' })).toBe('[g]')
    expect(stateTransitionLabel({})).toBeNull()
  })

  it('gives each part its kind', () => {
    expect(stateTransitionLabelParts({ trigger: 'error', guard: 'retries left' })).toEqual([
      { kind: 'trigger', text: 'error' },
      { kind: 'guard', text: '[retries left]' },
    ])
  })
})

describe('state transition edges', () => {
  const { builder, model: { model, step, rel }, views: { views, view, $include } } = Builder.forSpecification({
    elements: { step: {} },
  })

  it('keeps parallel transitions between two states apart', () => {
    const result = builder.with(
      model(
        step('running'),
        step('queued'),
        rel('running', 'queued', { stateTransition: { trigger: 'error', guard: 'retries left' } }),
        rel('running', 'queued', { stateTransition: { trigger: 'cancel' } }),
      ),
      views(view('lifecycle', $include('*'))),
    ).toLikeC4Model().view('lifecycle').$view
    expect(result.edges.map(e => e.label).sort()).toEqual(['cancel', 'error [retries left]'])
    expect(result.edges.map(e => e.stateTransition?.trigger).sort()).toEqual(['cancel', 'error'])
  })

  it('computes a self-transition as one edge', () => {
    const result = builder.with(
      model(
        step('running'),
        rel('running', 'running', { stateTransition: { trigger: 'heartbeat', effect: 'extend lease' } }),
      ),
      views(view('lifecycle', $include('*'))),
    ).toLikeC4Model().view('lifecycle').$view
    expect(result.edges).toHaveLength(1)
    expect(result.edges[0]!.source).toBe(result.edges[0]!.target)
    expect(result.edges[0]!.label).toBe('heartbeat / extend lease')
  })

  it('prefers transition parts over a plain title', () => {
    const result = builder.with(
      model(step('a'), step('b'), rel('a', 'b', { title: 'x', stateTransition: { trigger: 't' } })),
      views(view('lifecycle', $include('*'))),
    ).toLikeC4Model().view('lifecycle').$view
    expect(result.edges[0]!.label).toBe('t')
  })

  it('drops transition data from a summary edge to a collapsed parent', () => {
    const result = builder.with(
      model(
        step('idle'),
        step('job'),
        step('job.running'),
        rel('idle', 'job.running', { stateTransition: { trigger: 'start' } }),
      ),
      views(view('lifecycle', $include('idle', 'job'))),
    ).toLikeC4Model().view('lifecycle').$view
    expect(result.edges).toHaveLength(1)
    expect(result.edges[0]!.stateTransition).toBeUndefined()
  })
})
