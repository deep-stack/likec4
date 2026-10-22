import type { EdgeId } from '@likec4/core'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EdgeLabel } from './EdgeLabel'

function render(data: Record<string, unknown>) {
  return renderToStaticMarkup(
    <EdgeLabel edgeProps={{ id: 'e1' as EdgeId, data } as any} />,
  )
}

const text = (html: string) => html.replace(/<[^>]+>/g, '')

describe('EdgeLabel', () => {
  it('shows a state transition with its guard set apart', () => {
    const html = render({
      label: 'error [retries left] / back off',
      stateTransition: { trigger: 'error', guard: 'retries left', effect: 'back off' },
    })
    expect(text(html)).toBe('error [retries left] / back off')
    expect(html.match(/likec4-edge-label__guard/g)).toHaveLength(1)
    expect(html).toMatch(/<span class="likec4-edge-label__guard">\[retries left\]<\/span>/)
  })

  it('shows an ordinary label as before', () => {
    const html = render({ label: 'calls' })
    expect(text(html)).toBe('calls')
    expect(html).not.toContain('likec4-edge-label__guard')
  })
})
