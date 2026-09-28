import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// Dependency order; these are the runtime packages needed by ngin8r.
export const packages = ['core', 'log', 'config', 'generators', 'likec4'].map(directory => ({
  directory: `packages/${directory}`,
  imported: directory === 'likec4' ? 'likec4' : `@likec4/${directory}`,
  name: directory === 'likec4' ? '@deep-stack/likec4' : `@deep-stack/likec4-${directory}`,
}))

export function checkRelease({ packed = false, tag = process.env.RELEASE_TAG } = {}) {
  const release = JSON.parse(readFileSync('packages/likec4/package.json', 'utf8')).version
  assert.match(release, /^\d+\.\d+\.\d+-deepstack\.[1-9]\d*$/, 'Expected an explicit fork release version')
  if (tag) assert.equal(tag, `v${release}`, 'Release tag must match all five package versions')
  for (const pkg of packages) {
    const manifest = packed
      ? JSON.parse(execFileSync('tar', ['-xOzf', `${pkg.directory}/package.tgz`, 'package/package.json']))
      : JSON.parse(readFileSync(`${pkg.directory}/package.json`, 'utf8'))
    assert.equal(manifest.name, pkg.name)
    assert.equal(manifest.version, release, `${pkg.name}: mismatched release version`)
    assert.equal(manifest.publishConfig.registry, 'https://npm.pkg.github.com')
    assert.equal(manifest.repository.url, 'git+https://github.com/deep-stack/likec4.git')
    if (pkg.imported === 'likec4') {
      assert(
        !Object.keys(manifest.peerDependencies ?? {}).some(name => name.startsWith('@tanstack/ai')),
        'AI providers must not become install-time peers when registry optional-peer metadata is absent',
      )
    }
    if (!packed) continue
    for (const group of ['dependencies', 'optionalDependencies', 'peerDependencies']) {
      for (const [name, spec] of Object.entries(manifest[group] ?? {})) {
        assert(!/^(workspace:|catalog:|file:|link:)/.test(spec), `${pkg.name}: unresolved ${name}: ${spec}`)
        const fork = packages.find(candidate => candidate.imported === name)
        if (fork) assert.equal(spec, `npm:${fork.name}@${release}`, `${pkg.name}: wrong fork dependency`)
        else assert(!name.startsWith('@likec4/') || name === '@likec4/icons', `Unexpected upstream dependency: ${name}`)
      }
    }
  }
  console.log(`Validated ${packages.length} ${packed ? 'packed ' : ''}packages at ${release}`)
  return release
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  checkRelease({ packed: process.argv.includes('--packed') })
}
