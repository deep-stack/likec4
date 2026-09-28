import { DefaultHandles, ElementNodeContainer } from '../../../base-primitives'
import type { Types } from '../../types'

export function UmlArtifactNode(props: Types.NodeProps<'uml-artifact'>) {
  const { data } = props
  const diamond = data.umlArtifact === 'junction'
  const invisible = data.umlArtifact === 'anchor'
  return (
    <ElementNodeContainer nodeProps={props}>
      {!invisible && (
        <div
          role="img"
          aria-label={data.title}
          style={{
            width: '100%',
            height: '100%',
            display: 'grid',
            placeItems: 'center',
            color: 'var(--likec4-palette-hiContrast)',
            background: 'var(--likec4-palette-fill)',
            border: '1px solid var(--likec4-palette-stroke)',
            clipPath: diamond
              ? 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)'
              : 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)',
            whiteSpace: 'pre-wrap',
            padding: diamond ? 12 : 16,
            fontSize: 14,
          }}>
          {data.title}
        </div>
      )}
      <DefaultHandles />
    </ElementNodeContainer>
  )
}
