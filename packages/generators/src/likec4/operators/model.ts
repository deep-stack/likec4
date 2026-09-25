import type { Fqn } from '@likec4/core/types'
import { nameFromFqn, parentFqn, sortParentsFirst } from '@likec4/core/utils'
import { isEmptyish, pipe, values } from 'remeda'

import { schemas } from '../schemas'
import {
  type AnyOp,
  type Ctx,
  body,
  foreach,
  inlineText,
  lines,
  print,
  property,
  select,
  spaceBetween,
  when,
  withctx,
  zodOp,
} from './base'
import { fqnRef } from './expressions.ts'
import {
  colorProperty,
  descriptionProperty,
  linksProperty,
  metadataProperty,
  relationConnector,
  styleProperties,
  summaryProperty,
  tagsProperty,
  technologyProperty,
} from './properties'

// --- Tree building ---

type ElementData = schemas.model.element.Data

type ElementTreeNode = ElementData & {
  children?: ElementTreeNode[]
}

function buildTree(elements: ElementData[]): {
  roots: readonly ElementTreeNode[]
  nodes: ReadonlyMap<Fqn, ElementTreeNode>
  exists: (fqn: Fqn) => boolean
} {
  const nodes = new Map<Fqn, ElementTreeNode>()
  const roots: ElementTreeNode[] = []
  const sorted = pipe(
    elements,
    sortParentsFirst,
  )

  for (const element of sorted) {
    const node: ElementTreeNode = { ...element, children: [] }
    nodes.set(element.id, node)

    const parentId = parentFqn(element.id)
    const parent = parentId ? nodes.get(parentId) : undefined

    if (parent) {
      parent.children!.push(node)
    } else {
      roots.push(node)
    }
  }

  return {
    roots,
    nodes,
    exists: (fqn: Fqn) => nodes.has(fqn),
  }
}

// --- Predicates ---

function hasStyleProps(el: ElementData): boolean {
  return !isEmptyish(el.style)
}

function hasElementProps(el: ElementData): boolean {
  return !!(
    el.table || el.description || el.summary || el.technology || el.notation
    || (el.tags && el.tags.length > 0)
    || (el.links && el.links.length > 0)
    || !isEmptyish(el.metadata)
    || hasStyleProps(el)
  )
}

// --- Element ---

const elementProperties = zodOp(schemas.model.element)(
  lines(
    select(
      e => e.table,
      print(table =>
        `table {
${
          table.fields.map(field =>
            `  column ${JSON.stringify(field.id)} ${JSON.stringify(field.type)} { title ${JSON.stringify(field.title)}${
              field.keys?.includes('primary') ? ' primaryKey' : ''
            }${field.keys?.includes('unique') ? ' unique' : ''}${
              field.nullable !== undefined ? ` nullable ${field.nullable}` : ''
            } }`
          ).join('\n')
        }
}`
      ),
    ),
    tagsProperty(),
    technologyProperty(),
    summaryProperty(),
    descriptionProperty(),
    linksProperty(),
    metadataProperty(),
    select(
      e => hasStyleProps(e) ? e.style : undefined,
      body('style')(
        styleProperties(),
      ),
    ),
  ),
)

function elementTree() {
  return function elementTreeNodeOp<E extends ElementTreeNode>(
    { ctx, out }: Ctx<E>,
  ): Ctx<E> {
    const el = ctx
    const needsBody = (ctx.children?.length ?? 0) > 0 || hasElementProps(el)

    const name = nameFromFqn(el.id)

    const inline: AnyOp[] = [
      print(name),
      print('='),
      print(el.kind),
    ]

    if (el.title && el.title !== name) {
      inline.push(inlineText(el.title))
    }

    if (needsBody) {
      inline.push(
        body(
          lines(2)(
            withctx(el, elementProperties()),
            ...(ctx.children ?? []).map(node => withctx(node, elementTree())),
          ),
        ),
      )
    }

    return spaceBetween(...inline)({ ctx, out })
  }
}

// --- Relationship ---

function hasRelationStyle(rel: schemas.model.relationship.Data): boolean {
  return !!(
    rel.color || rel.line || rel.head || rel.tail
  )
}

function hasRelationProps(rel: schemas.model.relationship.Data): boolean {
  return !!(
    rel.tableRelation || rel.description || rel.summary || rel.technology
    || (rel.tags && rel.tags.length > 0)
    || (rel.links && rel.links.length > 0)
    || !isEmptyish(rel.metadata)
    || hasRelationStyle(rel)
    || rel.navigateTo
  )
}

export const relationship = zodOp(schemas.model.relationship)(
  spaceBetween(
    property('source', fqnRef()),
    print(rel => relationConnector(rel.kind, rel.isBidirectional)),
    property('target', fqnRef()),
    property(
      'title',
      inlineText(),
    ),
    when(
      hasRelationProps,
      body(
        select(
          r => r.tableRelation,
          print(relation => {
            const cardinality = (v: { min: 0 | 1; max: 1 | 'many' }) =>
              v.max === 'many' ? v.min === 0 ? 'zeroOrMany' : 'many' : v.min === 0 ? 'zeroOrOne' : 'one'
            return `tableRelation {
${relation.pairs.map(pair => `  pair ${JSON.stringify(pair.source)} -> ${JSON.stringify(pair.target)}`).join('\n')}${
              relation.sourceCardinality ? `\n  sourceCardinality ${cardinality(relation.sourceCardinality)}` : ''
            }${relation.targetCardinality ? `\n  targetCardinality ${cardinality(relation.targetCardinality)}` : ''}
}`
          }),
        ),
        tagsProperty(),
        technologyProperty(),
        summaryProperty(),
        descriptionProperty(),
        property('navigateTo'),
        linksProperty(),
        metadataProperty(),
        when(
          hasRelationStyle,
          body('style')(
            colorProperty(),
            property('line'),
            property('head'),
            property('tail'),
          ),
        ),
      ),
    ),
  ),
)

export const element = zodOp(schemas.model.element)(
  elementTree(),
)

// --- Main ---

export const model = zodOp(schemas.model.schema)(
  body('model')(
    lines(2)(
      select(
        d => buildTree(d.elements ? values(d.elements) : []).roots,
        lines(2)(
          foreach(
            elementTree(),
          ),
        ),
      ),
      select(
        d => d.relations ? values(d.relations) : undefined,
        lines(2)(
          foreach(
            relationship(),
          ),
        ),
      ),
    ),
  ),
)
