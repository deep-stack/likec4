import { Builder } from '@likec4/core/builder'
import { expect, it } from 'vitest'
import { generateD2 } from './d2/generate-d2'
import { generateDrawio } from './drawio/generate-drawio'
import { generateMermaid } from './mmd/generate-mmd'
import { generatePuml } from './puml/generate-puml'

function lifecycle() {
  const { builder, model: { model, start, end, step, rel }, views: { views, view, $include } } = Builder
    .forSpecification({
      elements: {
        start: { style: { shape: 'initial' } },
        end: { style: { shape: 'final' } },
        step: { style: { shape: 'state' } },
      },
    })
  return builder.with(
    model(
      start('begin'),
      step('queued', { title: 'Queued' }),
      step('running', { title: 'Running' }),
      end('done'),
      rel('begin', 'queued'),
      rel('queued', 'running', { stateTransition: { trigger: 'worker starts' } }),
      rel('running', 'queued', { stateTransition: { trigger: 'error', guard: 'retries left', effect: 'back off' } }),
      rel('running', 'done', { stateTransition: { trigger: 'capture saved' } }),
    ),
    views(view('lifecycle', $include('*'))),
  ).toLikeC4Model().view('lifecycle')
}

it('exports state shapes and transition labels to Mermaid and DrawIO', () => {
  const view = lifecycle()
  const mermaid = generateMermaid(view)
  expect(mermaid).toContain('shape: sm-circ')
  expect(mermaid).toContain('shape: fr-circ')
  expect(mermaid).toContain('error [retries left] / back off')
  const drawio = generateDrawio(view, { compressed: false })
  expect(drawio).toContain('shape=doubleEllipse')
  expect(drawio).toContain('error [retries left] / back off')
})

it('refuses state diagrams in D2 and PlantUML instead of drawing rectangles', () => {
  const view = lifecycle()
  expect(() => generateD2(view)).toThrow(/initial.*not supported/i)
  expect(() => generatePuml(view)).toThrow(/initial.*not supported/i)
})
