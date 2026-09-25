import { expect, it } from 'vitest'
import { tableNeighbourhood } from './tableNeighbourhood'

it('highlights immediate relationships without crossing through neighbours', () => {
  const edges = [
    { id: 'ab', source: 'a', target: 'b' },
    { id: 'ac', source: 'a', target: 'c' },
    { id: 'bc', source: 'b', target: 'c' },
    { id: 'aa', source: 'a', target: 'a' },
    { id: 'ab2', source: 'a', target: 'b' },
  ]
  const result = tableNeighbourhood('a', edges)
  expect([...result.nodes].sort()).toEqual(['a', 'b', 'c'])
  expect([...result.edges].sort()).toEqual(['aa', 'ab', 'ab2', 'ac'])
  expect([...tableNeighbourhood('isolated', edges).nodes]).toEqual(['isolated'])
})
