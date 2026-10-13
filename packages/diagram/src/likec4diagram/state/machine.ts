import { applyEdgeChanges, applyNodeChanges } from '@xyflow/react'
import type { ActorRef, SnapshotFrom, StateValueFrom } from 'xstate'
import { assign, raise, stopChild } from 'xstate/actions'
import type { BaseEditorActorRef } from '../../editor/actor/setup'
import type { NavigationPanelActorRef } from '../../navigationpanel/actor'
import type { OverlaysActorRef } from '../../overlays/overlaysActor'
import type { SearchActorRef } from '../../search/searchActor'
import {
  updateEdgeData,
  updateNodeData,
} from './assign'
import {
  assignDynamicViewVariant,
  cancelFitDiagram,
  emitOnLayoutTypeChange,
  raiseUpdateView,
  stopEditorActor,
  triggerChange,
  updateFeatures,
  updateInputs,
} from './machine.actions'
import type {
  BaseDiagramMachineLogic,
  EmittedEvents as DiagramEmittedEvents,
  Events as DiagramEvents,
} from './machine.setup'
import {
  Context as DiagramContext,
  machine,
} from './machine.setup'
import { initializing, isReady } from './machine.state.initializing'
import { navigating } from './machine.state.navigating'
import { ready } from './machine.state.ready'
import { absolutePosition, tableDisplayLayout } from './tableDisplay'

const _diagramMachine = machine.createMachine({
  initial: 'initializing',
  context: DiagramContext,
  states: {
    initializing,
    isReady,
    ready,
    navigating,
    final: {
      type: 'final',
    },
  },
  on: {
    'table.preview': {
      guard: ({ context }) => context.xynodes.some(node => 'table' in node.data && node.data.table),
      actions: assign(({ context, event }) => {
        const base = context.tablePreview?.view === context.view.id ? context.tablePreview.base : context.xynodes
        const expanded = event.expanded ?? {}
        return {
          tablePreview: { view: context.view.id, base, expanded },
          xynodes: tableDisplayLayout(base, context.xyedges, expanded),
        }
      }),
    },
    'interaction.restore': {
      actions: [
        cancelFitDiagram(),
        assign(({ event }) => ({ viewport: event.viewport, viewportChangedManually: event.manual })),
        ({ context, event }) => {
          void context.xyflow?.setViewport(event.viewport, { duration: 0 })
        },
      ],
    },
    'table.expand': {
      actions: assign(({ context, event }) => {
        const preview = context.tablePreview
        if (!preview || preview.view !== context.view.id) return {}
        const expanded = { ...preview.expanded }
        for (const node of preview.base) {
          if ((!event.node || node.id === event.node) && 'table' in node.data && node.data.table) {
            expanded[node.id] = event.expanded
          }
        }
        const nodes = tableDisplayLayout(preview.base, context.xyedges, expanded)
        if (event.node) {
          const before = absolutePosition(context.xynodes, event.node)
          const after = absolutePosition(nodes, event.node)
          for (const node of nodes) {
            if (!node.parentId) {
              node.position = { x: node.position.x + before.x - after.x, y: node.position.y + before.y - after.y }
            }
          }
        }
        return {
          tablePreview: { ...preview, expanded },
          xynodes: nodes,
          viewportChangedManually: true,
          tableRevealedField: null,
        }
      }),
    },
    'table.reveal': {
      actions: [
        raise(({ event }) => ({ type: 'table.expand', node: event.node, expanded: true })),
        raise(({ event }) => ({ type: 'table.highlight', node: event.node, field: event.field })),
      ],
    },
    'table.highlight': {
      actions: assign(({ event }) => ({ tableRevealedField: { node: event.node, field: event.field } })),
    },
    'table.focus': {
      actions: assign(({ context, event }) => ({
        tableFocusedNode: event.node ? { node: event.node, view: context.view.id } : null,
      })),
    },
    'table.resetPositions': {
      actions: assign(({ context }) => ({
        xynodes: context.tablePreview?.view === context.view.id
          ? tableDisplayLayout(context.tablePreview.base, context.xyedges, context.tablePreview.expanded)
          : context.xynodes.map(node => {
            if (!('table' in node.data) || !node.data.table) return node
            const saved = context.view.nodes.find(n => n.id === node.id)
            if (!saved) return node
            const parent = saved.parent ? context.view.nodes.find(n => n.id === saved.parent) : null
            return { ...node, position: { x: saved.x - (parent?.x ?? 0), y: saved.y - (parent?.y ?? 0) } }
          }),
      })),
    },
    'update.nodeData': {
      actions: assign(updateNodeData),
    },
    'update.edgeData': {
      actions: assign(updateEdgeData),
    },
    'switch.dynamicViewVariant': {
      guard: ({ context, event }) => context.dynamicViewVariant !== event.variant,
      actions: [
        assignDynamicViewVariant(),
        assign({
          viewportChangedManually: false,
        }),
        raiseUpdateView(),
      ],
    },
    'update.inputs': {
      actions: updateInputs(),
    },
    'update.view-bounds': {
      actions: assign(({ context, event }) => {
        return {
          view: {
            ...context.view,
            bounds: event.bounds,
          },
        }
      }),
    },
    'update.features': {
      actions: updateFeatures(),
    },
    'trigger.change': {
      actions: triggerChange(),
    },
    'emit.onLayoutTypeChange': {
      actions: emitOnLayoutTypeChange(),
    },
    'xyflow.applyChanges': {
      actions: assign(({ context, event }) => {
        return {
          xynodes: event.nodes ? applyNodeChanges(event.nodes, context.xynodes) : context.xynodes,
          xyedges: event.edges ? applyEdgeChanges(event.edges, context.xyedges) : context.xyedges,
        }
      }),
    },
    'xyflow.viewportMoved': {
      actions: machine.enqueueActions(({ context, event, enqueue }) => {
        if (event.type !== 'xyflow.viewportMoved') return
        if (event.manually) enqueue(cancelFitDiagram())
        enqueue.assign({
          viewportChangedManually: context.viewportChangedManually || event.manually,
          viewport: event.viewport,
        })
      }),
    },
    'destroy': {
      target: '.final',
      actions: [
        stopEditorActor(),
        cancelFitDiagram(),
        stopChild('hotkey'),
        stopChild('overlays'),
        stopChild('search'),
        stopChild('mediaPrint'),
        assign({
          xyflow: null,
          xystore: null as any,
          xyedges: [],
          xynodes: [],
          initialized: {
            xydata: false,
            xyflow: false,
          },
        }),
      ],
    },
  },
})

export interface DiagramMachineLogic extends
  BaseDiagramMachineLogic<
    {
      overlays: OverlaysActorRef | undefined
      search: SearchActorRef | undefined
      editor: BaseEditorActorRef | undefined
      navigationPanel: NavigationPanelActorRef | undefined
    },
    StateValueFrom<typeof _diagramMachine>
  > {}

/**
 * Here is a trick to reduce inference types
 */
export const diagramMachine: DiagramMachineLogic = _diagramMachine as any

export type DiagramMachineSnapshot = SnapshotFrom<DiagramMachineLogic>

export interface DiagramMachineRef extends ActorRef<DiagramMachineSnapshot, DiagramEvents, DiagramEmittedEvents> {}

export type {
  DiagramContext,
  DiagramEmittedEvents,
  DiagramEvents,
}
