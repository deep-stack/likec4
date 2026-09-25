import { type Fqn, FqnRef } from '@likec4/core'
import { type ValidationCheck, AstUtils } from 'langium'
import { ast } from '../ast'
import type { LikeC4Services } from '../module'
import { projectIdFrom } from '../utils'

export const checkTable = (): ValidationCheck<ast.TableProperty> => (table, accept) => {
  const body = table.$container
  if (!ast.isElementBody(body)) {
    accept('error', 'Table data is supported only on model elements', { node: table })
    return
  }
  if (body.props.filter(ast.isTableProperty).length > 1) accept('error', 'Duplicate table definition', { node: table })
  const styles = body.props.filter(ast.isElementStyleProperty).flatMap(p => p.props)
  const shape = styles.find(ast.isShapeProperty)?.value
    ?? body.$container.kind.ref?.$container.props.filter(ast.isElementStyleProperty).flatMap(p => p.props).find(
      ast.isShapeProperty,
    )?.value
  if (shape !== 'table') accept('error', 'Table data requires shape table', { node: table })
  const seen = new Set<string>()
  for (const field of table.fields) {
    if (seen.has(field.name)) accept('error', `Duplicate table field: ${field.name}`, { node: field, property: 'name' })
    seen.add(field.name)
    const keys = new Set<string>()
    for (const prop of field.props) {
      if (keys.has(prop.key)) accept('error', `Duplicate field property: ${prop.key}`, { node: prop })
      keys.add(prop.key)
    }
  }
}
export const checkTableRelation =
  (services: LikeC4Services): ValidationCheck<ast.TableRelationProperty> => (table, accept) => {
    const body = table.$container
    if (!ast.isRelationBody(body) || !ast.isRelation(body.$container)) {
      accept('error', 'Table relationships are supported only in the model', { node: table })
      return
    }
    if (body.props.filter(ast.isTableRelationProperty).length > 1) {
      accept('error', 'Duplicate table relationship', { node: table })
    }
    const relation = body.$container
    const doc = AstUtils.getDocument(relation)
    const parser = services.likec4.ModelParser.forDocument(doc)
    const source = parser._resolveRelationSource(relation)
    const target = parser.parseFqnRef(relation.target)
    const fieldsFor = (ref: FqnRef) => {
      if (!FqnRef.isModelRef(ref)) return undefined
      const description = services.likec4.FqnIndex.byFqn(projectIdFrom(doc), ref.model as Fqn).head()
      if (!description) return undefined
      const document = services.shared.workspace.LangiumDocuments.getDocument(description.documentUri)
      if (!document) return undefined
      const element = services.workspace.AstNodeLocator.getAstNode(document.parseResult.value, description.path)
      return ast.isElement(element) ? element.body?.props.find(ast.isTableProperty)?.fields : undefined
    }
    const sourceFields = fieldsFor(source), targetFields = fieldsFor(target)
    if (!sourceFields || !targetFields) {
      accept('error', 'Both relationship endpoints must define tables', { node: table })
    }
    const pairs = table.props.filter(ast.isTableFieldPair)
    if (!pairs.length) accept('error', 'At least one field pair is required', { node: table })
    const seen = new Set<string>()
    for (const pair of pairs) {
      if (!sourceFields?.some(f => f.name === pair.source)) {
        accept('error', `Unknown source table field: ${pair.source}`, { node: pair, property: 'source' })
      }
      if (!targetFields?.some(f => f.name === pair.target)) {
        accept('error', `Unknown target table field: ${pair.target}`, { node: pair, property: 'target' })
      }
      const id = `${pair.source}:${pair.target}`
      if (seen.has(id)) accept('error', 'Duplicate field pair', { node: pair })
      seen.add(id)
    }
    const cardinalities = new Set<string>()
    for (const prop of table.props.filter(ast.isTableCardinality)) {
      if (cardinalities.has(prop.key)) accept('error', `Duplicate ${prop.key}`, { node: prop })
      cardinalities.add(prop.key)
    }
  }
