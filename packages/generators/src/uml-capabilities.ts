import type { ProcessedView } from '@likec4/core'

/** Refuse lossy exports until a format has a tested UML-specific writer. */
export function assertNoUmlExport(view: ProcessedView, format: string): void {
  if (view.nodes.some(n => n.classifier || n.umlOrigin) || view.edges.some(e => e.uml || e.umlOrigin)) {
    throw new Error(
      `UML class diagram export is not supported by ${format}; use the LikeC4 viewer, image export or DSL export`,
    )
  }
}
