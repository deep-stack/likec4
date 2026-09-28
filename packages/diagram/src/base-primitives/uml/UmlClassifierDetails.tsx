import { type UmlClassifier, umlSections } from '@likec4/core'

/** Full semantic members remain available when a view hides compartments. */
export function UmlClassifierDetails({ classifier }: { classifier: UmlClassifier }) {
  const descriptions = new Map([
    ...classifier.attributes ?? [],
    ...classifier.operations ?? [],
    ...classifier.literals ?? [],
    ...classifier.compartments?.flatMap(c => c.entries) ?? [],
  ].map(member => [member.id, member.description]))
  return (
    <div>
      {umlSections(classifier).filter(section => section.rows.length).map(section => (
        <section key={section.id} aria-label={section.title}>
          <h4>{section.title}</h4>
          <ul>
            {section.rows.map(member => (
              <li key={member.id}>
                <code
                  style={{
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'anywhere',
                    fontStyle: member.abstract ? 'italic' : undefined,
                    textDecoration: member.static ? 'underline' : undefined,
                  }}>
                  {member.text}
                </code>
                {descriptions.get(member.id) && <p>{descriptions.get(member.id)}</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
