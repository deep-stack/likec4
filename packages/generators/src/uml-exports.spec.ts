import { Builder } from '@likec4/core/builder'
import { expect, it } from 'vitest'
import { generateD2 } from './d2/generate-d2'
import { generateDrawio } from './drawio/generate-drawio'
import { generateMermaid } from './mmd/generate-mmd'
import { generatePuml } from './puml/generate-puml'

it.each([generateD2, generateDrawio])(
  'never silently discards UML semantics (%s)',
  generate => {
    const { builder, model: { model, type }, views: { views, view, $include } } = Builder.forSpecification({
      elements: { type: {} },
    })
    const computed = builder.with(
      model(
        type('example', {
          classifier: { kind: 'class', attributes: [{ id: 'id', name: 'id', visibility: 'private' }] },
        }),
      ),
      views(view('index', $include('*'))),
    ).toLikeC4Model()
    expect(() => generate(computed.view('index'))).toThrow(/UML class diagram export is not supported/)
  },
)

it.each([generateMermaid, generatePuml])('exports native class members and inheritance (%s)', generate => {
  const { builder, model: { model, type, rel }, views: { views, view, $include } } = Builder.forSpecification({
    elements: { type: {} },
  })
  const built = builder.with(
    model(
      type('a', {
        classifier: {
          kind: 'class',
          attributes: [{ id: 'name', name: 'name', visibility: 'private', type: { external: 'String' } }],
        },
      }),
      type('b', { classifier: { kind: 'class' } }),
      rel('a', 'b', { uml: { id: 'base', kind: 'generalization', source: { id: 'sub' }, target: { id: 'base' } } }),
    ),
    views(view('index', $include('*'))),
  ).toLikeC4Model()
  const output = generate(built.view('index'))
  expect(output).toContain('-name : String')
  expect(output).toContain('--|>')
})
