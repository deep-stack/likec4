import { expect, it } from 'vitest'
import { fromSource } from '../node'

it('round trips structured members, end metadata and advanced associations', async () => {
  const source = `specification { element type }
  model {
    a = type { classifier { kind class abstract true
      stereotype 'entity'
      attribute key 'key' { type 'UUID' visibility private derived true readOnly true multiplicity '1' }
      operation find 'find' { visibility public abstract true parameter key 'key' { type 'UUID' direction in } returns ref 'a' { multiplicity '0..1' } }
      operation unknown 'unknown' { returns { multiplicity '0..1' } }
      template t 'T' { bound ref 'b' defaultType 'String' }
      compartment 'notes' 'Notes' { entry note 'Serializable' { description 'Contract' } }
    } }
    b = type { classifier { kind interface } }
    c = type { classifier { kind enumeration literal open 'OPEN' {} literal closed 'CLOSED' {} } }
    a -> b { uml { id 'implements' kind realization } }
    a -> a { uml { id 'children' kind association sourceEnd { id 'owner' aggregation composite }
      targetEnd { id 'child' role 'children' multiplicity '0..*' qualifier key 'key' { type 'UUID' } } } }
    umlModel {
      association triple 'Assignment' { end a { element 'a' } end b { element 'b' } end c { element 'c' } }
      associationClass assignment { associationRef 'triple' classifierRef 'a' }
      annotation note { kind note text 'Verified contract'
        target first { targetElement 'a' targetMember 'key' }
        target second { targetRelationship 'children' targetEndId 'child' }
      }
    }
  }
  views { view index { include * } }`
  const first = await fromSource(source, { throwIfInvalid: true })
  try {
    const original = (await first.parsedModel()).$data
    const dsl = await first.toDSL()
    const second = await fromSource(dsl, { throwIfInvalid: true })
    try {
      const copy = (await second.parsedModel()).$data
      expect(copy.elements).toEqual(original.elements)
      expect(copy.relations).toEqual(original.relations)
      expect(copy.uml).toEqual(original.uml)
      const layout = (await second.layoutedModel()).view('index').$view
      expect(layout.nodes.some(n => n.umlArtifact === 'junction')).toBe(true)
      expect(layout.nodes.every(n => n.width > 0 && n.height > 0)).toBe(true)
      expect(layout.edges.some(e => e.umlAttachment?.targetMember === 'key')).toBe(true)
    } finally {
      await second.dispose()
    }
  } finally {
    await first.dispose()
  }
})
