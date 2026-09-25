# Native ER integration validation

Native table data now travels through DSL parsing, validation, SDK Builder,
view computation, Graphviz row ports, saved model data and builtin React rendering.
The example no longer injects connections after computation or overrides renderers.

## Behaviors checked

- Fields and explicit cardinality survive DSL export/import, including quoted IDs.
- Parallel, composite and self-references retain their field mappings.
- Real Graphviz splines meet the correct rows, including view shape overrides.
- Changed table metadata raises saved-layout drift instead of mixing old splines
  with new rows. Cached layouts retain all composite pair paths.
- D2, Mermaid, PlantUML and DrawIO exports reject table content explicitly.
- Chromium verifies all 21 Webharvest fields, drag-time row alignment, self-loops,
  independent diagrams, scoped marker IDs, light/dark themes and narrow viewports.
- Pointer hover takes precedence over keyboard focus; unrelated edges dim.
- Six elliptical particles traverse highlighted connections in six seconds.
  Pause/reset controls live inside LikeC4. Reduced motion disables particles.
- No Liam package or source code is included.

## Scope

Dragging in a read-only artifact is transient. Reload restores saved positions.
The existing editor remains responsible for persisted manual layouts.
Table content determines geometry even under general shape styles.
Unknown cardinality/nullability remains unknown. No SQL parser was added.

The published ngin8r plugin remains pinned to its existing LikeC4 release.
This PR provides the native compiler/viewer functionality; adopting the fork's
release in ngin8r is a separate dependency integration, not a hidden local override.

## Verification commands

- `pnpm generate`
- `pnpm typecheck`
- `pnpm build`
- `pnpm exec vitest run --no-typecheck --testTimeout=30000`
- `pnpm exec oxlint --ignore-pattern 'e2e/**'`
- `PLAYWRIGHT_MODULE=<module path> node examples/er-tables/check.cjs`

The repository-wide lint invocation additionally scans the independent `e2e`
workspace, which is not installed in this checkout and reports missing Node type
packages. Lint excluding that uninstalled workspace checks the implementation.
The native Chromium interaction tests do run; this does not claim that the entire
separate E2E workspace was executed. The extended unit-test timeout avoids a
completion test timeout when many workers compete for this machine.

Earlier comparison builds on ports 34464–34467 remain unchanged.

## Results

Full suite: 304 files passed; 3,092 tests passed, one expected failure,
23 skipped and four todo. Package build: 28 tasks passed. Repository typecheck:
26 tasks passed, with a final incremental check after review fixes. Chromium:
all native ER interaction checks passed, zero page errors. Scoped lint has no
errors; pre-existing warning-level findings remain.

Final save-path regression: moved ER splines are translated into editor snapshots.
All 152 focused diagram/parser tests and incremental TypeScript checks pass after this fix.
