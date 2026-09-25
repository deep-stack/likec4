# ER table compatibility spike

An isolated source-level LikeC4 viewer example. No Liam runtime dependency.
The existing SPA development host loads workspace DSL through its Vite plugin and
has no custom-node example registry. This host uses its `sources` resolution
convention and the real LikeC4 viewer with `elementNode` custom rendering.

From the repository root (Node >=22.22.3):

```sh
pnpm install --frozen-lockfile
pnpm generate
node --conditions=sources --import tsx examples/er-tables/generate.ts
pnpm --dir packages/diagram exec vite --config ../../examples/er-tables/vite.config.ts
```

The Webharvest fixture is copied from the preserved auth-er-v1 comparison.
Unknown nullability is deliberately absent. Synthetic stress data is separate.
This is a compatibility experiment, not the final DSL or public API.

Generate the shared stylesheet before starting or building:

```sh
pnpm --dir styled-system/styles exec pandacss cssgen --outfile ../../examples/er-tables/panda.css
pnpm --dir packages/diagram exec vite build --config ../../examples/er-tables/vite.config.ts
```

Run `check.cjs` with Playwright installed (or set `PLAYWRIGHT_MODULE` to its
absolute module path). Set `PREVIEW_URL` to check a frozen static build.

## Evidence and limitations

- `generate.ts` uses the actual Builder, Graphviz WASM, GraphvizParser and model
  dump loader. It asserts every endpoint against the field's boundary, then
  confirms JSON serialization preserves all paths.
- `check.cjs` measures SVG endpoints against rendered rows, before and after
  hover and native zoom/fit. It checks all 21 source fields, six stress segments,
  keyboard focus, immediate neighbours, unrelated neighbour edges, two figures
  and both themes. Browser page errors fail the run.
- Hover and focus use the existing diagram actor. The example derives transient
  neighbour presentation from that state; production dimming/walkthrough
  coordination still needs Task 6.
- Row handles are mounted. The preview uses a viewport-local SVG edge layer
  on the existing LikeC4 canvas, translating saved splines with live node
  positions. Pointer dragging updates LikeC4 node state without enabling the
  full editor. Production edge registration, editor undo and persisted manual
  layouts remain separate work.
- Stress connections are injected after normal view computation. This explicitly
  does NOT prove aggregation, DSL support or composite relationship identity.
  Its paired columns are separate visual segments for this geometric test.
- Cardinality markers are not implemented. Direction arrows have per-figure
  identifiers. Green particles show declared source-to-target direction, with
  pause and reduced-motion support; they do not indicate live traffic.
- No Liam source has been copied. These are native LikeC4 primitives and original
  fixture/adapter code; Liam remains the visual/behaviour reference.

Frozen output and screenshots are preserved separately under Webharvest's
`.ngin8r/comparisons/auth-er-likec4-spike-v1/`, served on port 34466.
The dragging/animation revision is separately frozen as
`auth-er-likec4-spike-v2/`, served on port 34467. Positions are transient until
reload; Reset positions restores the saved layout. The synthetic test schema
is deliberately separate from the real Webharvest fixture.
