import type { UmlClassifier, UmlPresentation } from '@likec4/core'
import { measureUmlClassifier } from '@likec4/core/geometry'
import { classCompartments } from '@likec4/styles/recipes'
import { useReactFlow, useUpdateNodeInternals } from '@xyflow/react'
import { useEffect, useState } from 'react'

export function ClassCompartments({ id, title, classifier, presentation, embedded = false, onMember }: {
  onMember?: ((id: string) => void) | undefined
  embedded?: boolean
  id: string
  title: string
  classifier: UmlClassifier
  presentation?: UmlPresentation | undefined
}) {
  const styles = classCompartments()
  const geometry = measureUmlClassifier(classifier, title, presentation)
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const flow = useReactFlow()
  const updateInternals = useUpdateNodeInternals()
  const height = geometry.height -
    geometry.compartments.filter(c => collapsed.has(c.id)).reduce((n, c) => n + c.height - 28, 0)
  useEffect(() => {
    if (embedded) return
    flow.updateNode(id, node => ({ ...node, style: { ...node.style, height, width: geometry.width } }))
    updateInternals(id)
  }, [id, height, geometry.width, flow, updateInternals, embedded])
  return (
    <div className={styles.root} role="group" aria-label={`${classifier.kind} ${title}`}>
      <div
        className={styles.header}
        style={{ height: geometry.headerHeight, fontStyle: classifier.abstract ? 'italic' : undefined }}>
        {geometry.headerLines.map((line, i) => <div key={i}>{line}</div>)}
      </div>
      {geometry.compartments.map(section => (
        <section key={section.id} className={styles.section} aria-label={section.title}>
          <button
            type="button"
            className={`${styles.toggle} nodrag nopan`}
            aria-expanded={!collapsed.has(section.id)}
            onClick={e => {
              e.stopPropagation()
              setCollapsed(previous => {
                const next = new Set(previous)
                if (next.has(section.id)) {
                  next.delete(section.id)
                }
                else next.add(section.id)
                return next
              })
            }}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              aria-hidden="true"
              style={{ flexShrink: 0, transform: collapsed.has(section.id) ? 'rotate(-90deg)' : undefined }}>
              <path
                d="M3 4.5 6 7.5 9 4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round" />
            </svg>
            {section.title}
          </button>
          {!collapsed.has(section.id) &&
            section.rows.map(row => (
              <div
                key={row.id}
                className={`${styles.row} nodrag nopan`}
                tabIndex={0}
                data-uml-member={row.id}
                role={onMember ? 'button' : undefined}
                onClick={event => {
                  if (onMember) {
                    event.stopPropagation()
                    onMember(row.id)
                  }
                }}
                onKeyDown={event => {
                  if (onMember && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault()
                    event.stopPropagation()
                    onMember(row.id)
                  }
                }}
                aria-label={row.text}
                style={{
                  height: row.height,
                  textDecoration: row.static ? 'underline' : undefined,
                  fontStyle: row.abstract ? 'italic' : undefined,
                }}>
                {row.lines.join('\n')}
              </div>
            ))}
        </section>
      ))}
    </div>
  )
}
