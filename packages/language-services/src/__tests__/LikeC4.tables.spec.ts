import { expect, it } from 'vitest'
import { fromSource } from '../node/index'

it('round trips table fields, composite references and unknown metadata through DSL', async () => {
  const source = `specification { element record { style { shape table } } }
model {
 a = record { table { column id 'uuid' { primaryKey nullable false } column "record kind" 'text' { title 'Kind <&>' unique } } }
 b = record { table { column id 'uuid' column "record kind" 'text' } }
 a -> b { tableRelation { pair id -> id pair "record kind" -> "record kind" sourceCardinality one targetCardinality zeroOrMany } }
 b -> b { tableRelation { pair id -> "record kind" } }
}
views { view index { include * } }`
  const first = await fromSource(source, { throwIfInvalid: true })
  try {
    const generated = await first.toDSL()
    expect(generated).toContain('tableRelation')
    const second = await fromSource(generated, { throwIfInvalid: true })
    try {
      const a = (await first.parsedModel()).$data
      const b = (await second.parsedModel()).$data
      expect(Object.values(b.elements).map(e => e.table)).toEqual(Object.values(a.elements).map(e => e.table))
      expect(Object.values(b.relations).map(e => e.tableRelation)).toEqual(
        Object.values(a.relations).map(e => e.tableRelation),
      )
      expect((await second.layoutedModel()).view('index').$view.edges.map(e => e.tablePaths?.length)).toEqual([2, 1])
    } finally {
      await second.dispose()
    }
  } finally {
    await first.dispose()
  }
})
