import { fileURLToPath } from 'node:url'
import react from '../../packages/diagram/node_modules/@vitejs/plugin-react/dist/index.js'
import { defineConfig } from '../../packages/diagram/node_modules/vite/dist/node/index.js'
const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url))
export default defineConfig({
  root: path('./'),
  plugins: [react()],
  resolve: {
    conditions: ['sources', 'import', 'default'],
    dedupe: ['react', 'react-dom', '@xyflow/react'],
    alias: Object.fromEntries(
      ['react', 'react-dom', '@xyflow/react'].map(name => [name, path(`../../packages/diagram/node_modules/${name}`)]),
    ),
  },
  server: { host: '127.0.0.1', port: 34466, strictPort: true, fs: { allow: [path('../../')] } },
  build: { outDir: 'dist' },
})
