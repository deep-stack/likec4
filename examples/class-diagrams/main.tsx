import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LikeC4Model } from '../../packages/core/src/model/LikeC4Model'
import { LikeC4Diagram } from '../../packages/diagram/src/LikeC4Diagram'
import { LikeC4MantineProvider } from '../../packages/diagram/src/LikeC4MantineProvider'
import { LikeC4ModelProvider } from '../../packages/diagram/src/LikeC4ModelProvider'
import fixture from './fixture.json'
import '../../packages/diagram/src/styles.css'
import './panda.css'
const model = LikeC4Model.fromDump(fixture)
function App() {
  const [view, setView] = useState('overview')
  const [dark, setDark] = useState(false)
  return (
    <LikeC4MantineProvider forceColorScheme={dark ? 'dark' : 'light'}>
      <div style={{ padding: 12, display: 'flex', gap: 12 }}>
        <strong>Native UML class diagrams</strong>
        {['overview', 'publicApi', 'packages'].map(id => <button key={id} onClick={() => setView(id)}>{id}</button>)}
        <button onClick={() => setDark(!dark)}>Change theme</button>
      </div>
      <div style={{ height: 'calc(100vh - 56px)' }}>
        <LikeC4ModelProvider likec4model={model}>
          <LikeC4Diagram key={view} view={model.view(view).$view} controls fitView enableElementDetails />
        </LikeC4ModelProvider>
      </div>
    </LikeC4MantineProvider>
  )
}
createRoot(document.getElementById('root')!).render(<App />)
