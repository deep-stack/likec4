import { testFileScope as test } from '../test'

test('parses structured classifiers and association ends', async ({ t, expect }) => {
  const result = await t.validate(`
    specification { element type }
    model {
      customer = type 'Customer' {
        classifier {
          kind class
          attribute id 'id' { type 'UUID' visibility private readOnly true }
          operation find 'find' {
            visibility public static true
            parameter key 'key' { type 'UUID' direction in }
            returns 'Customer' { multiplicity '0..1' }
          }
        }
      }
      customer -> customer {
        uml { id 'recursive' kind association sourceEnd { id 'parent' role 'parent' }
          targetEnd { id 'children' multiplicity '0..*' navigability navigable } }
      }
    }
  `)
  expect(result.errors).toEqual([])
  const model = await t.buildModel()
  expect(model.elements['customer']?.classifier?.operations?.[0]?.parameters?.[0]?.name).toBe('key')
  expect(Object.values(model.relations)[0]?.uml?.target.multiplicity).toEqual({ lower: 0, upper: '*' })
})

test('reports UML semantic errors at authoring time', async ({ t, expect }) => {
  const result = await t.validate(`specification { element type }
  model { a = type { classifier { kind class attribute key { type ref 'missing' multiplicity '3..1' } } } }`)
  expect(result.errors.some(e => e.includes('multiplicity'))).toBe(true)
})
test('rejects properties in the wrong UML context instead of dropping them', async ({ t, expect }) => {
  const result = await t.validate(`specification { element type }
  model { a = type { classifier { kind class direction in } } }`)
  expect(result.errors.some(e => e.includes('direction'))).toBe(true)
})

test('keeps compartment filtering local to each view', async ({ t, expect }) => {
  const result = await t.validate(`specification { element type }
    model { a = type { classifier { kind class attribute secret { visibility private } } } }
    views { view index { include a with { umlPresentation { hideMember 'secret' hideCompartment 'operations' visibility public } } } }
  `)
  expect(result.errors).toEqual([])
  const model = await t.buildModel()
  expect(model.elements['a']?.classifier?.attributes).toHaveLength(1)
  expect(JSON.stringify(model.views['index'])).toContain('hiddenMembers')
})

test('revalidates UML type references when another document is removed', async ({ t, expect }) => {
  await t.addDocument('specification { element type }', 'spec.c4')
  const referenced = await t.addDocument(`model { b = type { classifier { kind class } } }`, 'types.c4')
  const owner = await t.addDocument(
    `model { a = type { classifier { kind class attribute value { type ref 'b' } } } }`,
    'owner.c4',
  )
  await t.validateAll()
  expect(owner.diagnostics).toEqual([])
  await t.removeDocument(referenced)
  expect(owner.diagnostics?.some(d => d.message.includes('Unknown classifier: b'))).toBe(true)
})

test('reports unresolved annotation targets on the annotation document', async ({ t, expect }) => {
  const result = await t.validate(`specification { element type }
    model { a = type { classifier { kind class } }
      umlModel { annotation note { kind note text 'Text' targetElement 'missing' } }
    }`)
  expect(result.errors).toContain('Unknown classifier: missing')
})

test('rejects unsupported UML extension bodies instead of silently dropping them', async ({ t, expect }) => {
  const result = await t.validate(`specification { element type }
    model { a = type b = type a -> b
      extend a { classifier { kind class } }
      extend a -> b { uml { id 'edge' kind association } }
    }`)
  expect(result.errors.length).toBeGreaterThan(0)
})
