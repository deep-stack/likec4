import { Builder } from '@likec4/core/builder'
import { expect, it } from 'vitest'
import { ElementViewPrinter } from './ElementViewPrinter'

it('gives Graphviz a diamond outline for questions', () => {
  const { builder, model: { model, question }, views: { views, view, $include } } = Builder.forSpecification({
    elements: { question: { style: { shape: 'diamond' } } },
  })
  const computed = builder.with(
    model(question('impact', { title: 'Impacting deliverables?' })),
    views(view('scenario', $include('*'))),
  ).toLikeC4Model()
  const scenario = computed.view('scenario').$view
  if (scenario._type !== 'element') throw new Error('Expected an element view')
  const dot = new ElementViewPrinter(scenario, computed.$styles).print()
  expect(dot).toMatch(/shape\s*=\s*"?diamond"?/)
})
