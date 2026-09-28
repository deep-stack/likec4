import { expect, it } from 'vitest'
import { Builder } from '../Builder'

it('preserves parallel self branches created through the Builder', () => {
  const { builder, model: { model, question, rel }, views: { views, view, $include } } = Builder.forSpecification({
    elements: { question: { style: { shape: 'diamond' } } },
  })
  const result = builder.with(
    model(
      question('check'),
      rel('check', 'check', { decisionBranch: { label: 'Retry' } }),
      rel('check', 'check', { decisionBranch: { label: 'Wait' } }),
    ),
    views(view('retry', $include('*'))),
  ).toLikeC4Model().view('retry').$view
  expect(result.edges.map(edge => edge.label).sort()).toEqual(['Retry', 'Wait'])
  expect(result.edges.every(edge => edge.parent === null)).toBe(true)
})

it('still rejects unmarked architecture self relationships', () => {
  const { builder, model: { model, step, rel } } = Builder.forSpecification({ elements: { step: {} } })
  expect(() => builder.with(model(step('a'), rel('a', 'a')))).toThrow(/same hierarchy/)
})
