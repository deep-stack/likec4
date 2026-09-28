# Publishing the deep-stack fork

The fork publishes five npm packages to [deep-stack GitHub Packages](https://github.com/orgs/deep-stack/packages):

| Package | Used for |
| --- | --- |
| `@deep-stack/likec4` | DSL compiler, CLI and bundled React viewer (`likec4/react`) |
| `@deep-stack/likec4-core` | Model types and APIs |
| `@deep-stack/likec4-generators` | Exports, including Mermaid |
| `@deep-stack/likec4-config` | Generator configuration dependency |
| `@deep-stack/likec4-log` | Shared logging dependency |

The unchanged `@likec4/icons` package comes from npmjs.org. Other workspace
packages are built into the compiler/viewer as needed; this workflow does not
publish them. In particular, a separate diagram package is not needed by ngin8r.

## Package names and versions

These five package manifests use `@deep-stack` names and the same explicit
version, starting with `1.59.4-deepstack.1`. Increment the final number for each
fork release; change the base version when adopting a new upstream release.
The root manifest keeps the upstream base version.

Workspace dependencies retain their existing import names with pnpm aliases:

```json
"@likec4/core": "workspace:@deep-stack/likec4-core@*"
```

`pnpm pack` turns this into an exact npm alias pointing at the fork version.
There is no tarball rewriting step. Use the pinned pnpm version (11.25.0) for
all commands, including nested build scripts. `pnpm --version` and
`pnpm exec pnpm --version` should both report that version. Corepack can supply
it from the root `packageManager` field.

## Release

1. Update all five package versions together, regenerate `pnpm-lock.yaml`, and
   merge the change with the implementation being released.
2. Create a GitHub release in `deep-stack/likec4` targeting that commit, with a
   tag matching the manifests, for example `v1.59.4-deepstack.1`.
3. Publish the release. Saving a draft does not publish packages.

The [release workflow](../.github/workflows/publish-deep-stack-packages.yml)
checks the tag and package versions, installs the locked dependencies, builds
and packs the five packages, and verifies their dependency aliases. It then
installs the tarballs into a clean npm consumer and checks the compiler, model
API, Mermaid export, dynamic viewer and native ER viewer in Chromium.
Only after those checks pass does pnpm publish the packages using the workflow's
`GITHUB_TOKEN` with `packages: write`. Fork suffixes are prerelease versions in
SemVer; the workflow explicitly assigns the npm `latest` tag for these fork
packages. A rerun skips versions pnpm already finds in the registry.

GitHub Packages initially creates packages with private visibility. After the
first release, configure the desired visibility and consumer repository access
on the package settings pages. The `repository` metadata connects every package
to `deep-stack/likec4`.

Local validation (does not publish):

```sh
pnpm install --frozen-lockfile
pnpm exec turbo run pack --filter='@deep-stack/likec4*'
RELEASE_TAG=v1.59.4-deepstack.1 node devops/check-fork-release.mjs --packed
pnpm --dir packages/likec4 exec playwright install chromium
node devops/smoke-fork-release.mjs
```

Alternatively set `CHROME_PATH` to an installed Chromium/Chrome executable for
the smoke check. Successful smoke checks remove their temporary consumer;
failed checks retain it and print the location.

## Consume from ngin8r

A local user needs a GitHub personal access token (classic) with `read:packages`
and access to the packages. This is required even for public npm packages on
GitHub Packages. Put this configuration in `~/.npmrc` and supply the environment
variable when running ngin8r:

```ini
@deep-stack:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}
```

Using the user-level file also covers ngin8r's compiler cache directory. GitHub
Actions consumers can use `GITHUB_TOKEN` when their repository has package
access. Never commit token values.

Consumer dependencies can retain existing imports through npm aliases:

```json
{
  "dependencies": {
    "likec4": "npm:@deep-stack/likec4@1.59.4-deepstack.1",
    "@likec4/core": "npm:@deep-stack/likec4-core@1.59.4-deepstack.1",
    "@likec4/generators": "npm:@deep-stack/likec4-generators@1.59.4-deepstack.1"
  }
}
```

ngin8r still pins upstream packages until its manifests, lockfiles, bundled
viewer and compiler-version checks are updated together. Publishing these
packages alone does not switch ngin8r over or enable native ER in its validators.
