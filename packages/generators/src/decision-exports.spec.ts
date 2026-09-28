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
  expect(generateMermaid(computed)).toContain('shape: rounded')
  expect(generateD2(computed)).toContain('shape: diamond')
  expect(generateDrawio(computed, { compressed: false })).toContain('shape=rhombus')
  for (
    const exportText of [
      generateMermaid(computed),
      generateD2(computed),
      generatePuml(computed),
      generateDrawio(computed, { compressed: false }),
    ]
  ) {
    expect(exportText).toContain('No')
  }
})
