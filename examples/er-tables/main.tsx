import { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LikeC4Model } from '../../packages/core/src/model/LikeC4Model'
import { LikeC4Diagram } from '../../packages/diagram/src/LikeC4Diagram'
import { LikeC4MantineProvider } from '../../packages/diagram/src/LikeC4MantineProvider'
import { LikeC4ModelProvider } from '../../packages/diagram/src/LikeC4ModelProvider'
import fixtures from './fixtures.json'
import '../../packages/diagram/src/styles.css'
import './panda.css'
import './preview.css'

type Fixture = typeof fixtures[number]
function Figure({ fixture, name }: { fixture: Fixture; name: string }) {
  const model = useMemo(() => LikeC4Model.fromDump(fixture.dump), [fixture])
  return (
    <section data-figure={name} className="figure">
      <LikeC4ModelProvider likec4model={model}>
        <LikeC4Diagram
          view={model.view(fixture.id).$view}
          controls
          fitView
          enableElementDetails={false}
          nodesSelectable={false} />
      </LikeC4ModelProvider>
    </section>
  )
}
function App() {
  const [dark, setDark] = useState(false)
  const [stress, setStress] = useState(false)
  const [two, setTwo] = useState(false)
  const fixture = fixtures[stress ? 1 : 0]!
  return (
    <LikeC4MantineProvider forceColorScheme={dark ? 'dark' : 'light'}>
      <main>
        <header className="page-header">
          <div>
            <div className="eyebrow">LIKEC4 / NATIVE ER DIAGRAMS</div>
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
            <button onClick={() => setTwo(!two)}>{two ? 'One figure' : 'Two figures'}</button>
          </nav>
        </header>
        <Figure key={fixture.id} fixture={fixture} name="first" />
        {two && <Figure key={`${fixture.id}-second`} fixture={fixture} name="second" />}
        <footer>
          Hover or focus a table to follow its immediate relationships. Pan, zoom and fit use LikeC4’s existing
          controls.<br />
          Drag any table to rearrange it; Reset positions restores the initial layout. Green particles show declared
          relationship direction, not live data traffic. Positions last until this page is reloaded. Crow’s-foot markers
          show the declared cardinality; unknown values remain unmarked.
        </footer>
      </main>
    </LikeC4MantineProvider>
  )
}
createRoot(document.getElementById('root')!).render(<App />)
