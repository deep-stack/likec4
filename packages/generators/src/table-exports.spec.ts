import { Builder } from '@likec4/core/builder'
import { expect, it } from 'vitest'
import { generateD2 } from './d2/generate-d2'
import { generateDrawio } from './drawio/generate-drawio'
import { generateMermaid } from './mmd/generate-mmd'
import { generatePuml } from './puml/generate-puml'

it.each([generateD2, generateDrawio, generateMermaid, generatePuml])('rejects lossy ER exports (%s)', generate => {
  const { builder, model: { model, record }, views: { views, view, $include } } = Builder.forSpecification({
    elements: { record: { style: { shape: 'table' } } },
  })
  const computed = builder.with(
    model(record('records', { table: { fields: [{ id: 'id', title: 'id', type: 'uuid' }] } })),
    views(view('index', $include('*'))),
  ).toLikeC4Model()
  expect(() => generate(computed.view('index'))).toThrow(/ER table export is not supported/)
})
