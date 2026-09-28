import {
  type ProcessedView,
  type UmlProperties,
  type UmlTyped,
  type UmlVisibility,
  formatUmlMultiplicity,
} from '@likec4/core'

export function hasUml(view: ProcessedView): boolean {
  return view.nodes.some(n => n.classifier || n.umlOrigin) || view.edges.some(e => e.uml || e.umlOrigin)
}

/** Native baseline class writers; richer constructs fail before producing partial output. */
export function generateUml(view: ProcessedView, format: 'Mermaid' | 'PlantUML'): string {
  const fail: (construct: string) => never = (construct) => {
    throw new Error(`${format} UML export does not support ${construct}; use the native viewer or DSL export`)
  }
  const safe = (text: string) =>
    /^[\p{L}\p{N}_ .\[\]]+$/u.test(text) ? text : fail(`text requiring escaping: ${JSON.stringify(text)}`)
  const props = (value: UmlProperties) => {
    if (
      value.constraints?.length || value.stereotypes?.length || value.readOnly !== undefined ||
      value.ordered !== undefined || value.unique !== undefined
    ) fail('member/end properties')
  }
  const typed = (value: UmlTyped) => {
    props(value)
    if (value.multiplicity || value.default !== undefined) fail('member multiplicity or defaults')
    return value.type ? safe('external' in value.type ? value.type.external : value.type.classifier) : ''
  }
  const vis = (visibility?: UmlVisibility) =>
    visibility ? ({ public: '+', private: '-', protected: '#', package: '~' })[visibility] : ''
  const names = new Map(view.nodes.map((n, i) => [n.id, `C${i}`]))
  const lines = [format === 'Mermaid' ? 'classDiagram' : '@startuml']
  for (const node of view.nodes) {
    if (node.umlOrigin) fail(node.umlOrigin.kind)
    const c = node.classifier
    if (!c) fail('mixed architecture/class views')
    if (node.children.length || node.parent) fail('nested classifiers')
    if (c.templates?.length || c.bindings?.length) fail('templates and bindings')
    if (c.compartments?.length) fail('custom compartments')
    if (c.constraints?.length || c.stereotypes?.length) fail('classifier constraints and stereotypes')
    if (!['class', 'interface', 'enumeration'].includes(c.kind)) fail(c.kind)
    if (format === 'Mermaid' && c.abstract) fail('abstract classifiers')
    const name = names.get(node.id)!
    const title = safe(node.title)
    lines.push(
      format === 'Mermaid'
        ? `class ${name}["${title}"] {`
        : `${c.abstract ? 'abstract ' : ''}${c.kind === 'enumeration' ? 'enum' : c.kind} "${title}" as ${name} {`,
    )
    if (format === 'Mermaid' && c.kind !== 'class') lines.push(`  <<${c.kind}>>`)
    const visible = (m: { id: string; visibility?: UmlVisibility }) =>
      !node.umlPresentation?.hiddenMembers?.includes(m.id) &&
      (!m.visibility || !node.umlPresentation?.visibility || node.umlPresentation.visibility.includes(m.visibility))
    if (!node.umlPresentation?.hiddenCompartments?.includes('attributes')) {
      for (const a of c.attributes ?? []) {
        if (!visible(a)) continue
        if (a.derived || a.redefines?.length || a.subsets?.length) fail('derived or redefined properties')
        const type = typed(a)
        const field = `${vis(a.visibility)}${safe(a.name)}${type ? ` : ${type}` : ''}`
        lines.push(
          `  ${format === 'PlantUML' && a.static ? '{static} ' : ''}${field}${
            format === 'Mermaid' && a.static ? '$' : ''
          }`,
        )
      }
    }
    if (!node.umlPresentation?.hiddenCompartments?.includes('operations')) {
      for (const o of c.operations ?? []) {
        if (!visible(o)) continue
        props(o)
        if (o.isConstructor || o.query) fail('constructor/query modifiers')
        const params = (o.parameters ?? []).map(p => {
          if (p.direction && p.direction !== 'in') fail('parameter directions')
          const type = typed(p)
          return `${safe(p.name)}${type ? ` : ${type}` : ''}`
        }).join(', ')
        const result = o.returns ? typed(o.returns) : ''
        const modifier = format === 'PlantUML' ? o.abstract ? '{abstract} ' : o.static ? '{static} ' : '' : ''
        lines.push(
          `  ${modifier}${vis(o.visibility)}${safe(o.name)}(${params})${
            result ? `${format === 'PlantUML' ? ' :' : ''} ${result}` : ''
          }${format === 'Mermaid' ? o.abstract ? '*' : o.static ? '$' : '' : ''}`,
        )
      }
    }
    if (!node.umlPresentation?.hiddenCompartments?.includes('literals')) {
      for (const literal of c.literals ?? []) {
        if (visible(literal)) {
          props(literal)
          lines.push(`  ${safe(literal.name)}`)
        }
      }
    }
    lines.push('}')
  }
  for (const edge of view.edges) {
    if (edge.umlOrigin) fail(edge.umlOrigin.kind)
    const u = edge.uml
    if (!u) fail('mixed architecture/class relationships')
    props(u)
    for (const end of [u.source, u.target]) {
      props(end)
      if (end.qualifiers?.length || end.member || end.navigability === 'nonNavigable' || end.visibility) {
        fail('qualified, member-bound or explicitly non-navigable ends')
      }
    }
    const marker = (end: typeof u.source, source: boolean) =>
      end.aggregation === 'composite'
        ? '*'
        : end.aggregation === 'shared'
        ? 'o'
        : end.navigability === 'navigable'
        ? source ? '<' : '>'
        : ''
    const connector = u.kind === 'generalization'
      ? '--|>'
      : u.kind === 'realization'
      ? '..|>'
      : u.kind === 'dependency'
      ? '..>'
      : `${marker(u.source, true)}--${marker(u.target, false)}`
    const label = (end: typeof u.source) =>
      [end.role && safe(end.role), end.multiplicity && formatUmlMultiplicity(end.multiplicity)].filter(Boolean).join(
        ' ',
      )
    const a = label(u.source), b = label(u.target)
    lines.push(
      `${names.get(edge.source)}${a ? ` "${a}"` : ''} ${connector}${b ? ` "${b}"` : ''} ${names.get(edge.target)}${
        edge.label ? ` : ${safe(edge.label)}` : ''
      }`,
    )
  }
  if (format === 'PlantUML') lines.push('@enduml')
  return lines.join('\n') + '\n'
}
