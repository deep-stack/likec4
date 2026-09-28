import type { ValidationCheck } from 'langium'
import { ast } from '../ast'

export const checkDecisionBranch = (): ValidationCheck<ast.DecisionBranchProperty> => (branch, accept) => {
  const body = branch.$container
  if (!ast.isRelationBody(body) || !ast.isRelation(body.$container)) {
    accept('error', 'Branches are supported only on model relationships', { node: branch })
    return
  }
  if (!branch.value.trim()) {
    accept('error', 'Branch label must not be empty', { node: branch, property: 'value' })
  }
  if (body.props.filter(ast.isDecisionBranchProperty).indexOf(branch) > 0) {
    accept('error', 'Duplicate branch label', { node: branch })
  }
}
