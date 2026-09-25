import { Handle, Position, useReactFlow, ViewportPortal } from '@xyflow/react'
import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LikeC4Model } from '../../packages/core/src/model/LikeC4Model'
import { ElementNodeContainer } from '../../packages/diagram/src/base-primitives/element/ElementNodeContainer'
import { DefaultHandles } from '../../packages/diagram/src/base-primitives/NodeHandles'
import { elementNode } from '../../packages/diagram/src/custom/customNodes'
import { useDiagramActorRef, useDiagramContext } from '../../packages/diagram/src/hooks/useDiagram'
import { LikeC4Diagram } from '../../packages/diagram/src/LikeC4Diagram'
import { LikeC4MantineProvider } from '../../packages/diagram/src/LikeC4MantineProvider'
import { LikeC4ModelProvider } from '../../packages/diagram/src/LikeC4ModelProvider'
import fixtures from './fixtures.json'
import { movePoints } from './move-points'
import '../../packages/diagram/src/styles.css'
import './panda.css'
import './preview.css'

type Fixture = typeof fixtures[number]
const PreviewContext = createContext<
  { fixture: Fixture; active: string | null; activate: (id: string | null) => void; motion: boolean }
>(null!)
const TableSketch = elementNode(({ nodeProps }) => {
  const { fixture, active } = useContext(PreviewContext)
  const actor = useDiagramActorRef()
  const flow = useReactFlow()
  const drag = useRef<{ pointer: number; start: { x: number; y: number }; position: { x: number; y: number } } | null>(
    null,
  )
  const id = nodeProps.id
  const fields = fixture.tables[id as keyof typeof fixture.tables]!
  const connected = !active || active === id ||
    fixture.connections.some(c => (c.source === active && c.target === id) || (c.target === active && c.source === id))
  return (
    <ElementNodeContainer
      nodeProps={{ ...nodeProps, selectable: false }}
      className="er-table"
      data-er-related={String(connected)}>
      <div
        className="nopan"
        tabIndex={0}
        onPointerDown={event => {
          if (event.button !== 0) return
          event.stopPropagation()
          event.currentTarget.setPointerCapture(event.pointerId)
          const position = flow.getNode(id)!.position
          drag.current = {
            pointer: event.pointerId,
            start: flow.screenToFlowPosition({ x: event.clientX, y: event.clientY }),
            position,
          }
        }}
        onPointerMove={event => {
          const origin = drag.current
          if (!origin || event.pointerId !== origin.pointer) return
          const point = flow.screenToFlowPosition({ x: event.clientX, y: event.clientY })
          actor.send({
            type: 'xyflow.applyChanges',
            nodes: [{
              id,
              type: 'position',
              dragging: true,
              position: {
                x: origin.position.x + point.x - origin.start.x,
                y: origin.position.y + point.y - origin.start.y,
              },
            }],
          })
        }}
        onPointerUp={event => {
          if (!drag.current) return
          drag.current = null
          actor.send({ type: 'xyflow.applyChanges', nodes: [{ id, type: 'position', dragging: false }] })
          event.currentTarget.releasePointerCapture(event.pointerId)
        }}
        onLostPointerCapture={() => {
          drag.current = null
          actor.send({ type: 'xyflow.applyChanges', nodes: [{ id, type: 'position', dragging: false }] })
        }}
        role="group"
        aria-label={`Table ${id}`}
        onFocus={() => actor.send({ type: 'xyflow.nodeMouseEnter', node: id })}
        onBlur={() => actor.send({ type: 'xyflow.nodeMouseLeave', node: id })}>
        <div className="er-header">
          <span aria-hidden>▦</span> {id}
        </div>
        {fields.map((field, index) => (
          <div key={field.name} className="er-row" data-field={field.name}>
            <span className="er-key" title={field.key || 'No supplied key constraint'}>{field.key}</span>
            <span className="er-name">{field.name}</span>
            <span className="er-type">{field.type}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={`${field.name}-source`}
              style={{ top: 40 + index * 36 + 18 }} />
            <Handle
              type="target"
              position={Position.Left}
              id={`${field.name}-target`}
              style={{ top: 40 + index * 36 + 18 }} />
          </div>
        ))}
      </div>
      <DefaultHandles direction="LR" />
    </ElementNodeContainer>
  )
})
const renderNodes = { element: TableSketch }
function HoverBridge() {
  const { activate } = useContext(PreviewContext)
  const hovered = useDiagramContext(ctx => ctx.xynodes.find(n => n.data.hovered)?.id ?? null)
  useEffect(() => {
    activate(hovered)
  }, [hovered, activate])
  return null
}
function RowConnections() {
  const { fixture, active, motion } = useContext(PreviewContext)
  const nodes = useDiagramContext(ctx => ctx.xynodes)
  const marker = `er-arrow-${useId().replaceAll(':', '')}`
  const view = fixture.dump.views[fixture.id as keyof typeof fixture.dump.views]!
  return (
    <ViewportPortal>
      <svg className="er-connections" aria-hidden="true">
        <defs>
          <marker
            id={marker}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse">
            <path d="M 0 1 L 9 5 L 0 9 Z" fill="var(--er-flow-color)" />
          </marker>
        </defs>
        {fixture.connections.map((connection, index) => {
          const saved = view.edges[index]!
          const initialSource = view.nodes.find(n => n.id === connection.source)!
          const initialTarget = view.nodes.find(n => n.id === connection.target)!
          const source = nodes.find(n => n.id === connection.source)!
          const target = nodes.find(n => n.id === connection.target)!
          if (!source || !target) return null
          const points = movePoints(saved.points, {
            x: source.position.x - initialSource.x,
            y: source.position.y - initialSource.y,
          }, { x: target.position.x - initialTarget.x, y: target.position.y - initialTarget.y })
          const d = `M ${points[0]!.join(',')} ` + Array.from({ length: (points.length - 1) / 3 }, (_, segment) =>
            `C ${
              points.slice(1 + segment * 3, 4 + segment * 3).map(p => p.join(',')).join(' ')
            }`).join(' ')
          const related = !active || connection.source === active || connection.target === active
          return (
            <g
              key={index}
              className="er-connection"
              data-connection={`edge${index}`}
              style={{ opacity: related ? 1 : .12 }}>
              <path className="er-connection-path" d={d} markerEnd={`url(#${marker})`} />
              {motion && related &&
                [0, 1, 2].map(particle => (
                  <circle key={particle} className="er-flow-particle" r="3.5">
                    <animateMotion dur="2.4s" begin={`${-particle * .8}s`} repeatCount="indefinite" path={d} />
                  </circle>
                ))}
            </g>
          )
        })}
      </svg>
    </ViewportPortal>
  )
}
function Figure({ fixture, name, motion }: { fixture: Fixture; name: string; motion: boolean }) {
  const [active, activate] = useState<string | null>(null)
  const model = useMemo(() => LikeC4Model.fromDump(fixture.dump), [fixture])
  return (
    <PreviewContext.Provider value={{ fixture, active, activate, motion }}>
      <section data-figure={name} className="figure">
        <LikeC4ModelProvider likec4model={model}>
          <LikeC4Diagram
            view={model.view(fixture.id).$view}
            renderNodes={renderNodes}
            controls
            fitView
            enableElementDetails={false}
            nodesSelectable={false}>
            <HoverBridge />
            <RowConnections />
          </LikeC4Diagram>
        </LikeC4ModelProvider>
      </section>
    </PreviewContext.Provider>
  )
}
function App() {
  const [dark, setDark] = useState(false)
  const [stress, setStress] = useState(false)
  const [two, setTwo] = useState(false)
  const [motion, setMotion] = useState(true)
  const [revision, setRevision] = useState(0)
  const fixture = fixtures[stress ? 1 : 0]!
  return (
    <LikeC4MantineProvider forceColorScheme={dark ? 'dark' : 'light'}>
      <main>
        <header className="page-header">
          <div>
            <div className="eyebrow">LIKEC4 / ER COMPATIBILITY SPIKE</div>
            <h1>Tables, in the same canvas.</h1>
            <p>
              {stress
                ? 'Synthetic test schema · exercises parallel references, a self-loop and paired columns. These tables are not from Webharvest.'
                : 'Webharvest · 4 tables, 21 fields and the original request–attempt relationship.'}
            </p>
          </div>
          <nav>
            <button onClick={() => setStress(!stress)}>
              {stress ? 'Show Webharvest schema' : 'Show synthetic test schema'}
            </button>
            <button onClick={() => setDark(!dark)}>{dark ? 'Light theme' : 'Dark theme'}</button>
            <button onClick={() => setMotion(!motion)}>{motion ? 'Pause flow' : 'Animate flow'}</button>
            <button onClick={() => setRevision(revision + 1)}>Reset positions</button>
            <button onClick={() => setTwo(!two)}>{two ? 'One figure' : 'Two figures'}</button>
          </nav>
        </header>
        <Figure key={`${fixture.id}-${revision}`} fixture={fixture} name="first" motion={motion} />
        {two && <Figure key={`${fixture.id}-second-${revision}`} fixture={fixture} name="second" motion={motion} />}
        <footer>
          Hover or focus a table to follow its immediate relationships. Pan, zoom and fit use LikeC4’s existing
          controls.<br />
          Drag any table to rearrange it; Reset positions restores the initial layout. Green dots show declared
          relationship direction, not live data traffic. Positions last until this page is reloaded. Cardinality and
          production DSL integration are still pending.
        </footer>
      </main>
    </LikeC4MantineProvider>
  )
}
createRoot(document.getElementById('root')!).render(<App />)
