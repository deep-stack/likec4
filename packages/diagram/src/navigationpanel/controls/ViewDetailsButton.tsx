import { cx } from '@likec4/styles/css'
import { Box, HStack } from '@likec4/styles/jsx'
import { hstack } from '@likec4/styles/patterns'
import {
  CloseButton,
  UnstyledButton,
} from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import {
  IconId,
  IconLink,
} from '@tabler/icons-react'
import * as m from 'motion/react-m'
import { useEffect, useRef } from 'react'
import { selectDiagramContext, useDiagramSelector } from '../../hooks/useDiagram'
import { Overlay } from '../../overlays/overlay/Overlay'
import { ViewDetailsWindow } from '../windows/ViewDetailsWindow'

const selector = selectDiagramContext(({ view }) => {
  return {
    id: view.id,
    links: view.links?.length ?? 0,
  }
})

type ViewDetailsButtonProps = {
  onOpen: () => void
}

export function ViewDetailsButton({ onOpen }: ViewDetailsButtonProps) {
  const [opened, handlers] = useDisclosure(false)
  const data = useDiagramSelector(selector)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const close = () => {
    handlers.close()
    // Wait until the modal is removed and the trigger is no longer inert.
    requestAnimationFrame(() => triggerRef.current?.focus())
  }

  // A different view should never inherit an open details panel.
  useEffect(() => {
    handlers.close()
  }, [data.id])

  const toggle = () => {
    if (opened) close()
    else {
      handlers.open()
      onOpen()
    }
  }

  return (
    <>
      <ViewDetailsCardTrigger triggerRef={triggerRef} linksCount={data.links} onClick={toggle} opened={opened} />
      {opened && (
        <Overlay className="likec4-view-details" aria-label="View details" onClose={close} openDelay={0}>
          <HStack justify="space-between" className="likec4-view-details-heading">
            <Box fontWeight="semibold">View details</Box>
            <CloseButton aria-label="Close view details" onClick={close} data-autofocus />
          </HStack>
          <div className="likec4-view-details-content">
            <ViewDetailsWindow />
          </div>
        </Overlay>
      )}
    </>
  )
}

const ViewDetailsCardTrigger = (
  { linksCount, onClick, opened, triggerRef }: {
    linksCount: number
    onClick: () => void
    opened: boolean
    triggerRef: React.Ref<HTMLButtonElement>
  },
) => (
  <UnstyledButton
    ref={triggerRef}
    aria-label="View details"
    aria-haspopup="dialog"
    aria-expanded={opened}
    title="View details"
    component={m.button}
    layout="position"
    aria-selected={opened}
    whileTap={{
      scale: 0.95,
      translateY: 1,
    }}
    onClick={e => {
      e.stopPropagation()
      onClick()
    }}
    className={cx(
      'group',
      hstack({
        gap: '2',
        layerStyle: 'likec4.panel.action',
        display: 'flex',
        _selected: {
          backgroundColor: {
            base: 'primary.body',
            _hover: 'primary.body.hover',
          },
          color: {
            base: 'primary.text',
            _hover: 'primary.text',
          },
        },
      }),
      ``,
    )}>
    <IconId size={16} stroke={1.8} />
    {linksCount > 0 && (
      <HStack gap="0.5">
        <IconLink size={14} stroke={2} />
        <Box
          css={{
            fontSize: 'xxs',
            fontWeight: 'bold',
            lineHeight: '1',
            opacity: '0.7',
          }}>
          {linksCount}
        </Box>
      </HStack>
    )}
  </UnstyledButton>
)
