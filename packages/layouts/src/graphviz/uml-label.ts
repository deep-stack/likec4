import type { UmlClassifier, UmlPresentation } from '@likec4/core'
import { measureUmlClassifier } from '@likec4/core/geometry'
const escape = (value: string) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
export function umlClassifierLabel(classifier: UmlClassifier, title: string, presentation?: UmlPresentation): string {
  const geometry = measureUmlClassifier(classifier, title, presentation)
  const cell = (lines: readonly string[], height: number, italic = false, underline = false, port?: string) => {
    let text = lines.map(escape).join('<BR/>')
    if (italic) text = `<I>${text}</I>`
    if (underline) text = `<U>${text}</U>`
    return `<TR><TD ${
      port ? `PORT="${port}" ` : ''
    }WIDTH="${geometry.width}" HEIGHT="${height}" FIXEDSIZE="TRUE">${text}</TD></TR>`
  }
  return `<TABLE BORDER="1" CELLBORDER="0" CELLSPACING="0" CELLPADDING="0">${
    cell(geometry.headerLines, geometry.headerHeight, classifier.abstract)
  }${
    geometry.compartments.map(c =>
      cell([c.title], 28) + c.rows.map(r => cell(r.lines, r.height, r.abstract, r.static, r.port)).join('')
    ).join('')
  }</TABLE>`
}
