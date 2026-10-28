import { extractViewTitleFromPath } from '@likec4/core/model'
import { css, cx } from '@likec4/styles/css'
import { hstack } from '@likec4/styles/patterns'
import {
  UnstyledButton,
} from '@mantine/core'
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react'
import { useSelector } from '@xstate/react'
import { AnimatePresence, LayoutGroup } from 'motion/react'
import * as m from 'motion/react-m'
import { memo } from 'react'
import { isTruthy } from 'remeda'
import { useEnabledFeatures } from '../context/DiagramFeatures'
import { useOptionalCurrentViewModel } from '../hooks/useCurrentViewModel'
import { selectDiagramContext, useDiagramSelector } from '../hooks/useDiagram'
import { useOptionalLikeC4Model } from '../hooks/useLikeC4Model'
import { deriveToggledFeatures } from '../likec4diagram/state/machine.setup'
import {
  LayoutWarning,
  LogoButton,
  NavigationButtons,
  OpenSource,
  SearchControl,
  ToggleReadonly,
  ViewDetailsButton,
} from './controls'
import { useNavigationActor } from './hooks'
import { breadcrumbTitle } from './styles.css'
import { DynamicViewControls } from './walkthrough'

const selectViewData = selectDiagramContext(s => {
  const toggledFeatures = deriveToggledFeatures(s)

  // Disable readonly toggle, if any of these conditions is true:
  const comparingLatest = toggledFeatures.enableCompareWithLatest && !!s.view.drifts && s.view._layout === 'auto'
  // const sequenceLayoutActive = ctx.view._type === 'dynamic' && ctx.dynamicViewVariant === 'sequence'

  // If All condition is true, we show toggle
  const noActiveWalkthrough = !isTruthy(s.activeWalkthrough)
  const hasEditor = s.features.enableEditor

  const isReadOnly = s.toggledFeatures.enableReadOnly ?? false

  return ({
    viewId: s.view.id,
    viewTitle: (s.view.title && extractViewTitleFromPath(s.view.title)) ?? 'Untitled View',
    navigationLabel: s.navigationLabel ?? null,
    isDynamicView: s.view._type === 'dynamic',
    editBtnVisible: hasEditor && noActiveWalkthrough,
    editBtnDisabled: comparingLatest,
    isReadOnly,
  })
})

const breadcrumbAnimation = {
  initial: { opacity: 0.5, translateX: -10, translateY: 0 },
  animate: { opacity: 1, translateX: 0, translateY: 0 },
  exit: { opacity: 0, translateX: -10, translateY: 0 },
  whileTap: {
    translateY: 1,
  },
}

export const NavigationPanelControls = memo(() => {
  const actor = useNavigationActor()
  const menuOpen = useSelector(actor.actorRef, s => s.matches('active'))
  const model = useOptionalLikeC4Model()
  const selectable = model ? [...model.views()].length > 1 : false
  const {
    enableLogo,
    enableNavigationButtons,
    enableDynamicViewWalkthrough,
    enableCompareWithLatest,
    enableSearch,
    enableVscode,
    enableViewDetails,
  } = useEnabledFeatures()
  const viewModel = useOptionalCurrentViewModel()
  const {
    editBtnDisabled,
    editBtnVisible,
    isReadOnly,
    viewTitle,
    navigationLabel,
    isDynamicView,
  } = useDiagramSelector(selectViewData)

  const folder = viewModel?.folder
  const folders = !folder || folder.isRoot ? [] : folder.breadcrumbs.map(s => ({
    folderPath: s.path,
    title: s.title,
  }))

  const folderBreadcrumbs = folders.flatMap(({ folderPath, title }, index, all) => [
    <UnstyledButton
      key={folderPath}
      component={m.button}
      layout="position"
      className={cx(
        breadcrumbTitle({ dimmed: true, truncate: true }),
        // 'mantine-active',
        css({
          userSelect: 'none',
          maxWidth: '[150px]',
          display: {
            base: 'none',
            '@/md': 'block',
          },
        }),
      )}
      {...breadcrumbAnimation}
      title={title}
      onMouseEnter={() => actor.send({ type: 'breadcrumbs.mouseEnter.folder', folderPath })}
      onMouseLeave={() => actor.send({ type: 'breadcrumbs.mouseLeave.folder', folderPath })}
      onClick={e => {
        e.stopPropagation()
        actor.send({ type: 'breadcrumbs.click.folder', folderPath })
      }}
    >
      {title}
    </UnstyledButton>,
    <m.div
      key={folderPath + '-separator'}
      layout
      className={css({
        display: {
          base: 'none',
          '@/md': 'block',
        },
        color: 'text.non-essential',
      })}>
      <IconChevronRight size={16} />
    </m.div>,
  ])

  const viewBreadcrumb = (
    <UnstyledButton
      layoutId={'view-title'}
      component={m.button}
      layout="position"
      {...breadcrumbAnimation}
      className={cx(
        // 'mantine-active',
        breadcrumbTitle({ truncate: true }),
        css({
          userSelect: 'none',
          _hover: { backgroundColor: '[var(--mantine-color-default-hover)]' },
          _focusVisible: { outline: '[2px solid currentColor]', outlineOffset: '[2px]' },
        }),
      )}
      title={selectable ? `${viewTitle} — choose a view` : viewTitle}
      aria-haspopup={selectable ? 'menu' : undefined}
      aria-expanded={selectable ? menuOpen : undefined}
      data-view-selector={selectable ? 'true' : undefined}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
      onMouseEnter={() => actor.send({ type: 'breadcrumbs.mouseEnter.viewtitle' })}
      onMouseLeave={() => actor.send({ type: 'breadcrumbs.mouseLeave.viewtitle' })}
      onClick={e => {
        e.stopPropagation()
        actor.send({ type: 'breadcrumbs.click.viewtitle' })
      }}
    >
      {viewTitle}
      {selectable && <IconChevronDown size={16} aria-hidden style={{ flexShrink: 0 }} />}
    </UnstyledButton>
  )

  return (
    <>
      {enableLogo && <LogoButton key="logo-button" />}
      {enableNavigationButtons && <NavigationButtons key="nav-buttons" />}
      {navigationLabel && (
        <m.div
          key="navigation-label"
          layout="position"
          className={css({
            fontSize: 'xs',
            fontWeight: 'medium',
            lineHeight: '1',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            flexShrink: 0,
            color: 'likec4.panel.text.dimmed',
          })}>
          {navigationLabel}
        </m.div>
      )}

      <m.div
        key="breadcrumbs"
        layout="size"
        className={hstack({
          gap: '1',
          flexShrink: 1,
          flexGrow: 1,
          flexWrap: 'nowrap',
          overflow: 'hidden',
        })}>
        <LayoutGroup id="navigation-panel-breadcrumbs">
          {folderBreadcrumbs}
          {viewBreadcrumb}
        </LayoutGroup>
      </m.div>

      <m.div
        key="actions"
        layout="size"
        className={hstack({
          gap: '1.5',
          flexShrink: 0,
          flexWrap: 'nowrap',
          flexGrow: 0,
        })}>
        {enableViewDetails && <ViewDetailsButton key="details" onOpen={() => actor.closeDropdown()} />}
        {enableVscode && <OpenSource key="open-source" />}
        {editBtnVisible && <ToggleReadonly key="toggle-readonly" disabled={editBtnDisabled} isReadOnly={isReadOnly} />}
        {enableDynamicViewWalkthrough && isDynamicView && <DynamicViewControls key="dynamic-view-controls" />}
        {enableSearch && !enableCompareWithLatest && <SearchControl key="search-control" />}
        <LayoutWarning key="outdated-manual-layout-warning" />
      </m.div>
    </>
  )
})
NavigationPanelControls.displayName = 'NavigationPanelControls'
