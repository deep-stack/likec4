import { type GrammarAST, type TokenBuilderOptions, DefaultTokenBuilder } from 'langium'

/** Contextual keywords remain legal element names without expanding every Id alternative. */
export const UML_KEYWORDS = new Set([
  'umlPresentation',
  'hideMember',
  'hideCompartment',
  'abstract',
  'aggregation',
  'annotation',
  'argument',
  'association',
  'associationClass',
  'associationRef',
  'attribute',
  'binding',
  'bound',
  'class',
  'classifier',
  'classifierRef',
  'comment',
  'compartment',
  'complete',
  'composite',
  'constraint',
  'constructor',
  'dataType',
  'default',
  'defaultType',
  'dependency',
  'derived',
  'description',
  'direction',
  'disjoint',
  'end',
  'entry',
  'enumeration',
  'generalization',
  'generalizationSet',
  'id',
  'in',
  'inout',
  'interface',
  'kind',
  'literal',
  'member',
  'multiplicity',
  'navigability',
  'navigable',
  'nonNavigable',
  'none',
  'note',
  'operation',
  'ordered',
  'out',
  'package',
  'parameter',
  'parameterRef',
  'primitiveType',
  'private',
  'protected',
  'public',
  'qualifier',
  'query',
  'readOnly',
  'realization',
  'redefines',
  'ref',
  'return',
  'returns',
  'role',
  'shared',
  'sourceEnd',
  'static',
  'stereotype',
  'subsets',
  'target',
  'targetElement',
  'targetEnd',
  'targetEndId',
  'targetMember',
  'targetRelationship',
  'template',
  'templateRef',
  'text',
  'type',
  'uml',
  'umlModel',
  'unspecified',
  'visibility',
])

export class LikeC4TokenBuilder extends DefaultTokenBuilder {
  override buildTokens(
    grammar: GrammarAST.Grammar,
    options?: TokenBuilderOptions,
  ): ReturnType<DefaultTokenBuilder['buildTokens']> {
    const tokens = super.buildTokens(grammar, options)
    if (!Array.isArray(tokens)) throw new Error('Expected the default Langium token list')
    const identifier = tokens.find(token => token.name === 'IdTerminal')
    if (!identifier) throw new Error('Missing LikeC4 identifier token')
    for (const token of tokens) {
      if (UML_KEYWORDS.has(token.name)) {
        token.CATEGORIES = [
          ...(Array.isArray(token.CATEGORIES) ? token.CATEGORIES : token.CATEGORIES ? [token.CATEGORIES] : []),
          identifier,
        ]
      }
    }
    return tokens
  }
}
