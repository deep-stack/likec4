import { Builder } from '@likec4/core/builder'
import { expect, it } from 'vitest'
import { generateD2 } from './d2/generate-d2'
import { generateDrawio } from './drawio/generate-drawio'
import { generateMermaid } from './mmd/generate-mmd'
import { generatePuml } from './puml/generate-puml'

it('exports decision shapes and branch text to supported formats', () => {
  const { builder, model: { model, question, action, rel }, views: { views, view, $include } } = Builder
    .forSpecification({
      elements: {
        question: { style: { shape: 'diamond' } },
        action: { style: { shape: 'pill' } },
      },
    })
  const computed = builder.with(
    model(
      question('impact', { title: 'Impacting deliverables?' }),
      action('continue', { title: 'Continue migration' }),
      rel('impact', 'continue', { decisionBranch: { label: 'No' } }),
    ),
    views(view('scenario', $include('*'))),
  ).toLikeC4Model().view('scenario')

  expect(generateMermaid(computed)).toContain('shape: diamond')
  expect(generateMermaid(computed)).toContain('shape: stadium')
  expect(() => generateD2(computed)).toThrow(/pill.*not supported/i)
  expect(() => generatePuml(computed)).toThrow(/decision.*not supported/i)
  expect(generateDrawio(computed, { compressed: false })).toContain('shape=rhombus')
  for (
    const exportText of [
      generateMermaid(computed),
      generateDrawio(computed, { compressed: false }),
    ]
  ) {
    expect(exportText).toContain('No')
  }
})

it.each(['diamond', 'pill'] as const)('rejects unsupported PlantUML %s shapes explicitly', shape => {
  const { builder, model: { model, node }, views: { views, view, $include } } = Builder.forSpecification({
    elements: { node: { style: { shape } } },
  })
  const result = builder.with(model(node('a')), views(view('v', $include('*')))).toLikeC4Model().view('v')
  expect(() => generatePuml(result)).toThrow(/decision.*not supported/i)
})

it('preserves diamond shape and branch labels in D2 when no pills are used', () => {
  const { builder, model: { model, question, action, rel }, views: { views, view, $include } } = Builder
    .forSpecification({
      elements: { question: { style: { shape: 'diamond' } }, action: {} },
    })
  const result = builder.with(
    model(question('check'), action('done'), rel('check', 'done', { decisionBranch: { label: 'Yes' } })),
    views(view('v', $include('*'))),
  )
    .toLikeC4Model().view('v')
  expect(generateD2(result)).toContain('shape: diamond')
  expect(generateD2(result)).toContain('Yes')
})
