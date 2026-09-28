import { type AstNode, type CstNode, type LangiumDocument, AstUtils, GrammarUtils } from 'langium'
import { DefaultDefinitionProvider, DefaultRenameProvider } from 'langium/lsp'
import type { DefinitionParams, RenameParams, TextEdit, WorkspaceEdit } from 'vscode-languageserver'
import { ast } from '../ast'
import type { LikeC4Services } from '../module'
import { projectIdFrom } from '../utils'

type Entry = { key: string; node: AstNode; token: CstNode; declaration: boolean; quoted: boolean }
const valueOf = (props: readonly ast.UmlProperty[], key: string) =>
  props.find((p): p is ast.UmlStringProperty => ast.isUmlStringProperty(p) && p.key === key)?.value

/** Project-local authored identities, deliberately separate from generated diagram IDs. */
export function umlReferences(services: LikeC4Services, document: LangiumDocument): Entry[] {
  const entries: Entry[] = []
  for (const doc of services.shared.workspace.LangiumDocuments.projectDocuments(projectIdFrom(document))) {
    for (const node of AstUtils.streamAllContents(doc.parseResult.value)) {
      const owner = AstUtils.getContainerOfType(node, ast.isElement)
      const ownerId = owner ? services.likec4.FqnIndex.getFqn(owner) : undefined
      const add = (key: string | undefined, property: string, declaration = false, quoted = true) => {
        const token = GrammarUtils.findNodeForProperty(node.$cstNode, property)
        if (key && token) entries.push({ key, node, token, declaration, quoted })
      }
      if (ast.isElement(node)) add(`classifier:${services.likec4.FqnIndex.getFqn(node)}`, 'name', true, false)
      if (ast.isUmlNamedBlock(node)) {
        if (['association', 'associationClass', 'generalizationSet', 'annotation'].includes(node.key)) {
          add(
            `relationship:${node.name}`,
            'name',
            true,
            /^['"]/.test(GrammarUtils.findNodeForProperty(node.$cstNode, 'name')?.text ?? ''),
          )
        }
        else if (ownerId && ['attribute', 'operation', 'literal', 'template'].includes(node.key)) {
          add(
            `member:${ownerId}:${node.name}`,
            'name',
            true,
            /^['"]/.test(GrammarUtils.findNodeForProperty(node.$cstNode, 'name')?.text ?? ''),
          )
        }
      }
      if (ast.isUmlTypeProperty(node) && node.isReference) add(`classifier:${node.value}`, 'value')
      if (!ast.isUmlStringProperty(node)) continue
      if (['element', 'classifierRef', 'templateRef', 'targetElement'].includes(node.key)) {
        add(`classifier:${node.value}`, 'value')
      }
      if (['relationship', 'associationRef', 'targetRelationship'].includes(node.key)) {
        add(`relationship:${node.value}`, 'value')
      }
      if (node.key === 'id' && ast.isUmlRelationshipProperty(node.$container)) {
        add(`relationship:${node.value}`, 'value', true)
      }
      if (ownerId && ['redefines', 'subsets'].includes(node.key)) add(`member:${ownerId}:${node.value}`, 'value')
      if (node.key === 'targetMember' && ast.isUmlNamedBlock(node.$container)) {
        const element = valueOf(node.$container.props, 'targetElement')
        if (element) add(`member:${element}:${node.value}`, 'value')
      }
    }
  }
  return entries
}
function at(entries: Entry[], document: LangiumDocument, position: DefinitionParams['position']) {
  const offset = document.textDocument.offsetAt(position)
  return entries.find(e =>
    AstUtils.getDocument(e.node).uri.toString() === document.uri.toString() && e.token.offset <= offset &&
    offset <= e.token.end
  )
}
export class UmlDefinitionProvider extends DefaultDefinitionProvider {
  constructor(private readonly umlServices: LikeC4Services) {
    super(umlServices)
  }
  override getDefinition(document: LangiumDocument, params: DefinitionParams) {
    const entries = umlReferences(this.umlServices, document)
    const reference = at(entries, document, params.position)
    const target = reference && entries.find(e => e.declaration && e.key === reference.key)
    if (!target) return super.getDefinition(document, params)
    return [{
      targetUri: AstUtils.getDocument(target.node).uri.toString(),
      targetRange: target.node.$cstNode!.range,
      targetSelectionRange: target.token.range,
      originSelectionRange: reference!.token.range,
    }]
  }
}
export class UmlRenameProvider extends DefaultRenameProvider {
  constructor(private readonly umlServices: LikeC4Services) {
    super(umlServices)
  }
  override prepareRename(document: LangiumDocument, params: DefinitionParams) {
    const reference = at(umlReferences(this.umlServices, document), document, params.position)
    return reference?.token.range ?? super.prepareRename(document, params)
  }
  override async rename(document: LangiumDocument, params: RenameParams): Promise<WorkspaceEdit | undefined> {
    const entries = umlReferences(this.umlServices, document)
    const reference = at(entries, document, params.position)
    if (!reference) return super.rename(document, params)
    const target = entries.find(e => e.declaration && e.key === reference.key)
    if (!target) return undefined
    const targetDoc = AstUtils.getDocument(target.node)
    const base = ast.isElement(target.node)
      ? await super.rename(targetDoc, {
        ...params,
        textDocument: { uri: targetDoc.uri.toString() },
        position: target.token.range.start,
      })
      : undefined
    const changes: Record<string, TextEdit[]> = { ...base?.changes }
    for (const entry of entries.filter(e => e.key === reference.key)) {
      const uri = AstUtils.getDocument(entry.node).uri.toString()
      const edits = changes[uri] ??= []
      if (edits.some(e => JSON.stringify(e.range) === JSON.stringify(entry.token.range))) continue
      const oldValue = entry.token.text
      const oldName = target.token.text.replace(/^['"]|['"]$/g, '')
      const newValue = reference.key.startsWith('classifier:') && !entry.declaration
        ? oldValue.replace(/^['"]|['"]$/g, '').replace(
          new RegExp(`${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`),
          params.newName,
        )
        : params.newName
      edits.push({ range: entry.token.range, newText: entry.quoted ? JSON.stringify(newValue) : newValue })
    }
    return { changes }
  }
}
