import type { UmlClassifier, UmlPresentation } from '../types'
import { umlClassifierHeading, umlSections } from '../uml/presentation'

export const UML_FONT_SIZE = 14
export const UML_LINE_HEIGHT = 20
/** Deterministic wrapping shared by the canvas and Graphviz labels. */
export function wrapUmlText(text: string, columns: number): string[] {
  if (!Number.isInteger(columns) || columns < 1) throw new Error('Text columns must be a positive integer')
  return text.split('\n').flatMap(line => {
    const chars = Array.from(line)
    const rows: string[] = []
    while (chars.length) rows.push(chars.splice(0, columns).join(''))
    return rows.length ? rows : ['']
  })
}
export function measureUmlClassifier(classifier: UmlClassifier, title: string, presentation: UmlPresentation = {}) {
  const heading = umlClassifierHeading(title, classifier)
  const sections = umlSections(classifier, presentation)
  const longest = Math.max(
    ...heading.map(t => Array.from(t).length),
    ...sections.flatMap(s => s.rows.map(r => Array.from(r.text).length)),
  )
  const width = Math.min(560, Math.max(280, longest * 9 + 32))
  const columns = Math.floor((width - 32) / 9)
  const headerLines = heading.flatMap(t => wrapUmlText(t, columns))
  const headerHeight = headerLines.length * UML_LINE_HEIGHT + 24
  let y = headerHeight
  let portIndex = 0
  const compartments = sections.map(section => {
    const top = y
    y += 28
    const rows = section.rows.map(row => {
      const lines = wrapUmlText(row.text, columns)
      const height = lines.length * UML_LINE_HEIGHT + 12
      const result = { ...row, lines, y, height, port: `member${portIndex++}` }
      y += height
      return result
    })
    return { ...section, rows, y: top, height: y - top }
  })
  return { width, height: y, headerHeight, headerLines, compartments }
}

/** Rebase a routed spline while retaining its bends, parallel lanes and self loops. */
export function moveUmlSpline(
  points: import('../types').NonEmptyArray<import('./types').Point>,
  originalSource: import('./bbox').BBox,
  originalTarget: import('./bbox').BBox,
  source: import('./bbox').BBox,
  target: import('./bbox').BBox,
): import('../types').NonEmptyArray<import('./types').Point> {
  const delta = (p: readonly [number, number], old: import('./bbox').BBox, next: import('./bbox').BBox) =>
    [
      next.x + (p[0] - old.x) * next.width / Math.max(1, old.width) - p[0],
      next.y + (p[1] - old.y) * next.height / Math.max(1, old.height) - p[1],
    ] as const
  const a = delta(points[0]!, originalSource, source)
  const b = delta(points.at(-1)!, originalTarget, target)
  return points.map((p, index) => {
    const t = index / Math.max(1, points.length - 1)
    return [p[0] + a[0] * (1 - t) + b[0] * t, p[1] + a[1] * (1 - t) + b[1] * t] as const
  }) as import('../types').NonEmptyArray<import('./types').Point>
}
