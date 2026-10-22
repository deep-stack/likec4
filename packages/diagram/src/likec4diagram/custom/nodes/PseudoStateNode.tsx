import { css } from '@likec4/styles/css'
import { DefaultHandles, ElementNodeContainer, ElementShape } from '../../../base-primitives'
import type { Types } from '../../types'

// A dot or a bullseye takes the theme's foreground, not the element's colour
const pseudoState = css({
  '& .likec4-pseudo-state': {
    fill: 'likec4.mixColor',
    stroke: 'likec4.mixColor',
  },
})

/**
 * A UML initial or final state: a small dot or bullseye, without any text.
 */
export function PseudoStateNode(props: Types.NodeProps<'element'>) {
  return (
    <ElementNodeContainer nodeProps={props} className={pseudoState} aria-label={props.data.title}>
      <ElementShape {...props} />
      <DefaultHandles direction={props.data.viewLayoutDir} />
    </ElementNodeContainer>
  )
}
