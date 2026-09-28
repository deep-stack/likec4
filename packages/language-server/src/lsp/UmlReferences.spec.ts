import { testFileScope as test } from '../test'

test('navigates and renames declared classifier references across files', async ({ t, expect }) => {
  const type = await t.addDocument(
    `specification { element type }
    model { original = type { classifier { kind class } } }`,
    'type.c4',
  )
  const owner = await t.addDocument(
    `model { consumer = type { classifier { kind class attribute value { type ref 'original' } } } }`,
    'owner.c4',
  )
  await t.validateAll()
  const position = owner.textDocument.positionAt(owner.textDocument.getText().indexOf('\'original\'') + 2)
  const params = { textDocument: { uri: owner.uri.toString() }, position }
  const definitions = await t.services.lsp.DefinitionProvider!.getDefinition(owner, params)
  expect(definitions?.[0]?.targetUri).toBe(type.uri.toString())
  const edit = await t.services.lsp.RenameProvider!.rename(owner, { ...params, newName: 'renamed' })
  expect(edit?.changes?.[owner.uri.toString()]?.[0]?.newText).toBe('"renamed"')
  expect(edit?.changes?.[type.uri.toString()]?.some(e => e.newText === 'renamed')).toBe(true)
})
