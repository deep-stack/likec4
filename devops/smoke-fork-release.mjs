import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { checkRelease, packages } from './check-fork-release.mjs'

const version = checkRelease({ packed: true })
const directory = mkdtempSync(join(tmpdir(), 'likec4-fork-consumer-'))
const require = createRequire(resolve('packages/likec4/package.json'))
const dependencies = Object.fromEntries(
  packages.map(pkg => [pkg.imported, `file:${resolve(pkg.directory, 'package.tgz')}`]),
)
for (const name of ['react', 'react-dom', 'esbuild', 'playwright']) {
  dependencies[name] = require(`${name}/package.json`).version
}
writeFileSync(join(directory, 'package.json'), JSON.stringify({ private: true, type: 'module', dependencies }, null, 2))
copyFileSync('devops/fork-consumer-check.mjs', join(directory, 'check.mjs'))
copyFileSync('examples/er-tables/webharvest.c4', join(directory, 'er.c4'))
try {
  // Install the actual tarballs under the aliases ngin8r uses. No workspace links,
  // rewritten manifests, NODE_PATH, or already-published fork versions are needed.
  execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], {
    cwd: directory,
    stdio: 'inherit',
    timeout: 300_000,
  })
  for (const pkg of packages) {
    const installed = join(directory, 'node_modules', pkg.imported)
    assert(realpathSync(installed).startsWith(directory), 'Consumer must not use workspace symlinks')
    const manifest = JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8'))
    assert.equal(manifest.name, pkg.name)
    assert.equal(manifest.version, version)
  }
  execFileSync(process.execPath, ['node_modules/likec4/bin/likec4.mjs', '--version'], {
    cwd: directory,
    stdio: 'inherit',
    timeout: 30_000,
  })
  execFileSync(process.execPath, ['check.mjs'], { cwd: directory, stdio: 'inherit', timeout: 120_000 })
  rmSync(directory, { recursive: true, force: true })
} catch (error) {
  console.error(`Packed consumer preserved for inspection: ${directory}`)
  throw error
}
