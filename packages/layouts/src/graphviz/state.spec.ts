import { Builder } from '@likec4/core/builder'
import { describe, expect, it } from 'vitest'
import { ElementViewPrinter } from './ElementViewPrinter'
import { pxToInch } from './utils'

const inch = (px: number) => String(pxToInch(px)).replace('.', '\\.')

function print() {
  const { builder, model: { model, start, end, step }, views: { views, view, $include } } = Builder.forSpecification({
    elements: {
      start: { style: { shape: 'initial' } },
      end: { style: { shape: 'final' } },
      step: { style: { shape: 'state' } },
    },
  })
  const computed = builder.with(
    model(
      start('begin', { title: 'A very long title', description: 'Some description', style: { size: 'xl' } }),
      step('queued', { title: 'Queued' }),
      end('done', { title: 'Done' }),
    ),
    views(view('lifecycle', $include('*'))),
  ).toLikeC4Model()
  const lifecycle = computed.view('lifecycle').$view
  if (lifecycle._type !== 'element') throw new Error('Expected an element view')
  return new ElementViewPrinter(lifecycle, computed.$styles).print()
}

function nodeOf(dot: string, id: string) {
  const node = new RegExp(`"${id}" \\[([^\\]]*)\\]`).exec(dot)?.[1]
  if (!node) throw new Error(`No node ${id} in\n${dot}`)
  return node
}

describe('state diagram shapes in Graphviz', () => {
  it('draws an initial state as a small fixed circle without a label', () => {
    const node = nodeOf(print(), 'begin')
    expect(node).toMatch(/shape\s*=\s*"?circle"?/)
    expect(node).toMatch(/fixedsize\s*=\s*"?true"?/)
    expect(node).toMatch(new RegExp(`width\\s*=\\s*"?${inch(22)}"?`))
    expect(node).toMatch(new RegExp(`height\\s*=\\s*"?${inch(22)}"?`))
    expect(node).toMatch(/label\s*=\s*""/)
    expect(node).not.toContain('A very long title')
  })

  it('draws a final state as a small fixed double circle without a label', () => {
    const node = nodeOf(print(), 'done')
    expect(node).toMatch(/shape\s*=\s*"?doublecircle"?/)
    expect(node).toMatch(/fixedsize\s*=\s*"?true"?/)
    expect(node).toMatch(new RegExp(`width\\s*=\\s*"?${inch(26)}"?`))
    expect(node).toMatch(/label\s*=\s*""/)
  })

  it('draws a state as a compact rounded box', () => {
    const node = nodeOf(print(), 'queued')
    expect(node).toMatch(/shape\s*=\s*"?box"?/)
    expect(node).toMatch(/style\s*=\s*"?[^"\]]*rounded/)
    expect(node).toMatch(new RegExp(`height\\s*=\\s*"?${inch(56)}"?`))
  })
})
