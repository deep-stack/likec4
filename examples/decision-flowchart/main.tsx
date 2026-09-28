import { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LikeC4Model } from '../../packages/core/src/model/LikeC4Model'
import { LikeC4Diagram } from '../../packages/diagram/src/LikeC4Diagram'
import { LikeC4MantineProvider } from '../../packages/diagram/src/LikeC4MantineProvider'
import { LikeC4ModelProvider } from '../../packages/diagram/src/LikeC4ModelProvider'
import modelDump from './model.json'
import '../../packages/diagram/src/styles.css'
import './panda.css'
import './preview.css'

function App() {
  const [dark, setDark] = useState(false)
  const model = useMemo(() => LikeC4Model.fromDump(modelDump), [])
  return (
    <LikeC4MantineProvider forceColorScheme={dark ? 'dark' : 'light'}>
      <main>
        <header>
          <div>
            <p className="eyebrow">LIKEC4 / NATIVE DECISION FLOWCHART</p>
            <h1>The Scenario</h1>
            <p>Follow the Yes and No paths from each question.</p>
          </div>
          <button onClick={() => setDark(!dark)}>{dark ? 'Light theme' : 'Dark theme'}</button>
        </header>
        <section className="figure">
          <LikeC4ModelProvider likec4model={model}>
            <LikeC4Diagram view={model.view('scenario').$view} controls fitView />
          </LikeC4ModelProvider>
        </section>
      </main>
    </LikeC4MantineProvider>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
