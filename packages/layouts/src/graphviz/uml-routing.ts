import type { DiagramEdge, DiagramNode, Point } from '@likec4/core'

/** Two graph edges meeting at an invisible UML attachment form one smooth curve. */
export function smoothUmlAttachments(nodes: readonly DiagramNode[], edges: DiagramEdge[]): void {
  for (const anchor of nodes.filter(n => n.umlArtifact === 'anchor')) {
    const incoming = edges.find(e => e.target === anchor.id && e.uml)
    const outgoing = edges.find(e => e.source === anchor.id && e.uml)
    if (!incoming || !outgoing) continue
    const a = incoming.dir === 'back' ? [...incoming.points].reverse() : [...incoming.points]
    const b = outgoing.dir === 'back' ? [...outgoing.points].reverse() : [...outgoing.points]
    if (a.length < 4 || b.length < 4) continue
    const center: Point = [anchor.x + anchor.width / 2, anchor.y + anchor.height / 2]
    const before = a[a.length - 3]!, after = b[2]!
    const dx = after[0] - before[0], dy = after[1] - before[1]
    const length = Math.hypot(dx, dy)
    if (length < 1) continue
    const left = Math.min(48, Math.hypot(center[0] - before[0], center[1] - before[1]) / 2)
    const right = Math.min(48, Math.hypot(after[0] - center[0], after[1] - center[1]) / 2)
    a[a.length - 1] = center
    a[a.length - 2] = [center[0] - dx / length * left, center[1] - dy / length * left]
    b[0] = center
    b[1] = [center[0] + dx / length * right, center[1] + dy / length * right]
    incoming.points = (incoming.dir === 'back' ? a.reverse() : a) as typeof incoming.points
    outgoing.points = (outgoing.dir === 'back' ? b.reverse() : b) as typeof outgoing.points
  }
}
