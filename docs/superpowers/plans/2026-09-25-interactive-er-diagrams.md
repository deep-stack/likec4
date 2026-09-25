# Interactive ER Diagrams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add native ER tables, field connections, and immediate-neighbour hover highlighting to LikeC4, then demonstrate them in a preserved ngin8r comparison.

**Architecture:** Adapt Liam's small ER primitives into LikeC4's existing canvas and state machine. Carry typed table and endpoint data through parsing, computation, Graphviz layout, and saved-model rendering. Do not embed the Liam viewer.

**Tech Stack:** TypeScript, React Flow, XState, Langium, Graphviz WASM, PandaCSS/Mantine, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-25-interactive-er-diagrams.md`

**Status:** Visual checkpoint approved. Native implementation is complete; final verification, preserved comparison packaging and PR review are in progress. Execute inline, with a final fresh code review.

## Global Constraints

- Node >=22.22.3; pnpm is pinned by package.json (currently 11.25.0). `.tool-versions` currently says 11.15.0; use packageManager for reproducible dependency commands without editing either pin as unrelated work.
- Keep one LikeC4 canvas and XState machine.
- Updated user requirement: optional pausable directional green particles, respecting reduced motion. ER edges do not imply chronological execution or live traffic.
- Missing nullability/cardinality stays unknown.
- No `@liam-hq/erd-core` runtime dependency and no SQL importer in this change.
- No edits to generated output by hand; run `pnpm generate` after grammar/style changes.
- Work on `feature/interactive-er-diagrams`, never main. Preserve existing comparison artifacts.
- Commits: one plain line, at most 10 words, no attribution footer. Never merge the PR.
- Use patch changesets for changed published packages.

## Review Focus

1. Multiple relationships between the same tables: do not merge distinct field endpoints (Task 3).
2. Composite keys and self-references: no dropped field pair or invented cardinality (Tasks 2–4).
3. Unknown metadata and hostile labels: do not invent nullability or permit DOT/HTML injection (Tasks 2 and 4).
4. Keyboard focus, hover exit, and view replacement: no stuck dimming or disrupted walkthrough (Task 6).
5. Saved layouts after field reordering: no stale endpoints or rows (Task 4).

## Pre-implementation audit

Read `docs/superpowers/audits/2026-09-25-liam-integration.md` and its executed probe results. Do not import Liam leaf components through unsupported package paths. Do not reuse `convertSchemaToNodes` or `constraintsToRelationships`: confirmed defects affect composite handles, uniqueness inference, and invalid pair lengths. Adapt the adjacency algorithm; implement field ports and explicit cardinality against the typed LikeC4 contract. Namespace SVG markers per figure and keep URL/history state local to the existing host.

Before Task 2, extend Task 1 with a minimal real LikeC4 integration spike: mount row handles, pass Graphviz port output through LikeC4's actual parser/saved layout, and verify row endpoints, self-loops, multiple/composite FKs, two independent figures, both themes, and unchanged document anchors. Direct WASM port support has already passed at the pinned version; do not repeat that isolated probe unless inputs change. The renderer/parser integration remains unproven and must pass this early gate.

## Execution order

Visual sketch and integration spike → data/parser → view computation → layout → native renderer → hover → integration and comparison.

Do not start by changing ngin8r's published dependency pins. First prove the LikeC4 fork works. The last task creates a separately bundled comparison; production ngin8r integration is a follow-up PR in its own repository.

### Task 1: Isolated visual table sketch and integration spike

**Files:** Create `examples/er-tables/README.md` and a fixture module beside the existing diagram development examples after inspecting their loader. Prototype component: `packages/diagram/src/custom/ErTableSketch.tsx` (temporary until Task 5).

**Consumes:** The saved `auth-er-v1/schema.json` under Webharvest `.ngin8r/comparisons/`, plus Liam's table-row reference.
**Produces:** An isolated table-node example using LikeC4's `elementNode` wrapper, style tokens, and existing controls.

- [x] Inspect the diagram development example registration and choose its existing mounting path; document the exact run command in `examples/er-tables/README.md` before editing it.
- [x] Copy the four-table schema as a non-sensitive fixture, preserving all 21 field names/types and supplied key markers. Store unknown nullability as absent.
- [x] Render a header and rows using an isolated custom node; leave every builtin shape unchanged. Use the existing LikeC4 viewer, not a new React Flow root.
- [x] Capture light/dark screenshots, check all rows and long labels, and present the concrete sketch for visual review. This is the repository shape workflow's visual checkpoint.
- [x] Commit approved sketch and fixture: `git commit -m "add ER table preview"`.

### Task 2: Typed table data, parser, and validation

**Create:** `packages/core/src/types/table.ts`, `packages/language-server/src/validation/table.ts`, `packages/language-server/src/validation/table.spec.ts`, `packages/language-server/src/__tests__/model-table.spec.ts`.
**Modify:** `packages/core/src/types/model-logical.ts`, `packages/core/src/types/index.ts`, `styled-system/preset/src/defaults/types.ts`, `packages/language-server/src/like-c4.langium`, `packages/language-server/src/model/model-parser.ts`, the validator registration, and existing builder element/relationship property types under `packages/core/src/builder/`.

**Consumes:** The exact data types and DSL example in the spec.
**Produces:** Optional `table` and `tableRelation` properties on parsed models, with the same contract available through the SDK Builder.

- [ ] Add parser tests using the existing `testFileScope` helper. Parse the spec's example and assert:

```ts
expect(model.elements.requests.table?.fields).toEqual([
  { id: 'id', title: 'id', type: 'text', keys: ['primary'] },
])
expect(Object.values(model.relations)[0]?.tableRelation).toEqual({
  pairs: [{ source: 'id', target: 'request_id' }],
  sourceCardinality: { min: 1, max: 1 },
  targetCardinality: { min: 0, max: 'many' },
})
```

- [ ] Add failures for duplicate fields, empty pairs, mismatched endpoints, absent tables, and table data on another shape. Add positive cases for unknown metadata, quoted type labels, composite pairs, and self-references.
- [ ] Run `pnpm exec vitest run packages/language-server/src/__tests__/model-table.spec.ts packages/language-server/src/validation/table.spec.ts` and record the expected failure before implementation.
- [ ] Add `table` to the canonical shape list. Implement the spec's additive grammar, parser conversion, diagnostic locations, and SDK property types. Field IDs use the existing identifier grammar; titles and type labels are escaped plain text.
- [ ] Run `pnpm generate`, then `pnpm exec tsc --build` before downstream checks. Repeat the focused tests and existing element/relation validation tests.
- [ ] Commit: `git commit -m "describe tables and field relationships"`.

### Task 3: Preserve ER semantics through view computation

**Modify:** `packages/core/src/types/view-computed.ts`, `packages/core/src/types/view-layouted.ts`, `packages/core/src/compute-view/utils/buildComputedNodes.ts`, `packages/core/src/compute-view/utils/view-hash.ts`, relation aggregation in `packages/core/src/compute-view/element-view/`, and the model dump types.
**Create:** `packages/core/src/compute-view/element-view/__test__/tables.spec.ts`.

**Consumes:** `Element.table` and `Relationship.tableRelation`.
**Produces:** Computed nodes/edges carrying the same typed properties and stable relation identities.

- [ ] Write tests that compute an ER view containing two FKs between the same tables and verify both field mappings survive; write a composite-pair assertion using ordered `pairs` equality.
- [ ] Add cases for included/excluded endpoint tables, nested tables with equal local field IDs, and summary edges through collapsed ancestors.
- [ ] Run `pnpm exec vitest run packages/core/src/compute-view/element-view/__test__/tables.spec.ts` to establish failure.
- [ ] Propagate table data. Preserve distinct direct endpoint mappings rather than aggregating them by source/target table alone. For summary edges, omit field-port semantics and retain relation provenance.
- [ ] Include geometry-relevant table content and endpoint pairs in view hashing. Preserve unknown metadata on dump/load.
- [ ] Run the focused tests plus existing element-view computation and model-dump tests.
- [ ] Commit: `git commit -m "preserve table connections in views"`.

### Task 4: Table-aware Graphviz layout and saved geometry

**Create:** `packages/core/src/geometry/table.ts`, `packages/core/src/geometry/table.spec.ts`, `packages/layouts/src/graphviz/TableLabel.ts`, `packages/layouts/src/graphviz/TableLayout.spec.ts`.
**Modify:** `packages/layouts/src/graphviz/DotPrinter.ts`, `packages/layouts/src/graphviz/GraphvizParser.ts`, `packages/layouts/src/graphviz/types-dot.ts`, `packages/core/src/types/view-layouted.ts`, and `packages/core/src/manual-layout/{calcDriftsFromSnapshot,applyCachedLayout,applyManualLayout}.ts` with their tests.

**Consumes:** Computed table data and pairs.
**Produces:** Layouted tables with field ports, row geometry, and correctly routed connections. Geometry helpers are shared with rendering; no browser-only measurement requirement.

- [ ] Define and test deterministic `tableGeometry(fields, metrics)` returning total size and field rectangles. Metrics include font/row/header/padding inputs from LikeC4 styling. Test 0, 1, 21, and 100 rows and wrapped labels.
- [ ] Add real Graphviz WASM integration tests for two field ports, parallel FKs, self-loops, and composite pairs. Assert each endpoint falls on the expected row's boundary within a small pixel tolerance.
- [ ] Add escaping tests using labels containing `<`, `>`, `&`, quotes, and DOT-like text; generated node/port IDs must not be derived from unescaped labels.
- [ ] Run `pnpm exec vitest run packages/core/src/geometry/table.spec.ts packages/layouts/src/graphviz/TableLayout.spec.ts` before implementation.
- [ ] Emit Graphviz table labels with generated safe port names and matching sizes, then preserve row/port geometry from layout. Treat one composite relation as one semantic relation with identifiable visual pair segments.
- [ ] Verify the WASM probe before expanding the implementation. If ports fail, record the exact failure and revise the design with the user; do not substitute browser ELK silently.
- [ ] Add drift tests: changing field order/type/title/size or endpoint pairs invalidates geometry; changing colour alone does not when metrics are unchanged. Preserve unchanged node placement where the existing manual-layout policy allows, but recompute affected row edges. Consult the user if existing auto-apply semantics are ambiguous, as AGENTS.md requires.
- [ ] Run layout and manual-layout suites. Commit: `git commit -m "lay out table fields and connections"`.

### Task 5: Native table nodes and field edges

**Create:** `packages/diagram/src/base-primitives/table/TableNode.tsx`, `TableRow.tsx`, and `packages/diagram/src/likec4diagram/custom/edges/TableRelationshipEdge.tsx`.
**Modify:** `packages/diagram/src/likec4diagram/DiagramXYFlow.tsx`, `packages/diagram/src/likec4diagram/convert-to-xyflow.ts`, `packages/diagram/src/likec4diagram/types.ts`, `xyflow-diagram/diagram-view.ts`, native node registration, shape/icon mappings, and PandaCSS table recipes under `styled-system/preset/src/recipes/`.

**Consumes:** Saved geometry from Task 4.
**Produces:** Native table nodes and relationship edges on the existing canvas, with no second viewport or toolbar.

- [ ] Add renderer/browser assertions for all 21 baseline fields, field-handle IDs, marker cardinality, and untruncated rows. Test empty tables, long names, parallel pairs, self-loops, and composite references.
- [ ] Replace the isolated sketch with a native table component using LikeC4 tokens. Derive row positions from shared geometry rather than CSS estimates.
- [ ] Register a dedicated internal table edge type. Preserve relation provenance and source callbacks while using row-aware endpoints; use saved paths for initial rendering and update endpoints correctly when dragging is enabled.
- [ ] Include accessible names for key/cardinality markers and full field/type text. Unknown nullable/cardinality data must not render a misleading indicator.
- [ ] Run `pnpm generate`, focused renderer checks, and typecheck. Capture light/dark screenshots at desktop and narrow widths; test fit/fullscreen and table movement.
- [ ] Remove temporary sketch registration only after the native example works. Commit: `git commit -m "render native ER tables"`.

### Task 6: Neighbourhood highlighting in LikeC4 state

**Create:** `packages/diagram/src/likec4diagram/state/tableNeighbourhood.ts`, `tableNeighbourhood.spec.ts`, and `machine.state.ready.table-hover.spec.ts`.
**Modify:** `machine.actions.ts`, `machine.setup.ts`, `machine.state.ready.ts`, node/row focus handlers, and table edge/node flags.

**Consumes:** Visible table nodes, visual pair edges, and current hover/focus target.
**Produces:** Derived highlight state owned by the existing diagram machine.

- [ ] Define `tableNeighbourhood(nodeId, edges)` returning sets of node IDs and visual edge IDs. Write this behavioural test before implementation:

```ts
const edges = [
  { id: 'ab', source: 'a', target: 'b' },
  { id: 'ac', source: 'a', target: 'c' },
  { id: 'bc', source: 'b', target: 'c' },
]
const result = tableNeighbourhood('a', edges)
expect([...result.nodes].sort()).toEqual(['a', 'b', 'c'])
expect([...result.edges].sort()).toEqual(['ab', 'ac'])
```

- [ ] Test disconnected tables, self-loops, several edges to one neighbour, focus equivalence, hover exit, view replacement, node removal, and preservation of existing selection/walkthrough state.
- [ ] Run `pnpm exec vitest run packages/diagram/src/likec4diagram/state/tableNeighbourhood.spec.ts packages/diagram/src/likec4diagram/state/machine.state.ready.table-hover.spec.ts` to establish failure.
- [ ] Adapt Liam's adjacency concept into typed LikeC4 state. Transient highlighting applies only to table interactions and must not clear unrelated user state. Preserve original shape mouse behaviour.
- [ ] Verify exactly the adjacent table/edge set in Chromium and clear state on pointer exit and blur. Honour reduced motion; match the approved six-particle, six-second highlight animation.
- [ ] Run existing walkthrough tests as a regression check. Commit: `git commit -m "highlight related tables on hover"`.

### Task 7: Authoring, packaging, and persistent comparison

**Modify:** Three TextMate grammars (`packages/vscode/`, `apps/playground/`, `apps/docs/`), shape completion tests, `packages/generators/src/likec4/schemas/{model,views}.ts`, DSL generation and tests, and exhaustive shape mappings in other exporters.
**Create:** A patch changeset for affected published packages, `examples/er-tables/model.c4`, provenance notes if source was copied, and a separate comparison directory outside the frozen artifacts.

**Consumes:** The complete native feature.
**Produces:** Authorable, saved-model-compatible feature plus a reviewable ngin8r document using a separately built fork bundle.

- [ ] Test DSL → parsed model → DSL → parsed model retains table fields/pairs/cardinality. Update completions and syntax tokens. Reject or clearly report unsupported ER exports instead of silently stripping fields.
- [ ] Add the four-table fixture and a clearly labelled synthetic stress fixture containing branching, self-reference, composite keys, and long tables. Do not present synthetic schema as Webharvest facts.
- [ ] Run `pnpm generate`, `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`; run focused Playwright tests for the new examples and existing architecture/sequence controls. Record environment failures separately from test failures.
- [ ] Build the fork's compiler and viewer packages with one consistent identity. Do not feed new model data into ngin8r's existing hard-pinned 1.59.4 validator/viewer unchanged.
- [ ] Create a new standalone ngin8r comparison export, copying the saved Webharvest facts and replacing only the ER figure. Use a comparison-local adapter/bundle and explicit experiment metadata; production ngin8r dependency/schema changes belong to a subsequent PR.
- [ ] Preserve ports 34464 and 34465 and existing checksums. Serve the new comparison on a new stable local port with the same user-service pattern. Save source, model, screenshots, checksums, build identity, and a feature-validation report.
- [ ] Verify the new full document and fullscreen ER view in Chromium, including offline assets and keyboard focus; compare visual fidelity with the preserved Liam artifact.
- [ ] Add patch changesets and commit: `git commit -m "document and verify ER diagrams"`.
- [ ] Review the complete diff, then `git fetch origin && git log --oneline HEAD..origin/main`. Rebase if required; ask on nontrivial conflicts. Push with `--force-with-lease` only if a previously pushed branch was rebased.
- [ ] Open a PR against main with a description under 2000 characters covering behaviour, scope, validation, and the separate ngin8r integration follow-up. Never merge it.

## Self-review

- Spec coverage: data/validation (Task 2), view semantics (3), ports/drift (4), appearance/accessibility (1/5), hover (6), authoring and persisted demonstration (7).
- Review Focus cases are assigned to tests above.
- One `TableDefinition`/`TableRelationship` contract travels from DSL/SDK to saved model. No parallel JSON-in-metadata schema.
- Geometry is produced before reading saved diagrams. The initial implementation does not require Liam or ELK in the reader.
- Visual review happens before the full model/shape wiring. Existing artifacts and application source remain untouched by comparison generation.

## Task 1 compatibility result (2026-09-25)

See `examples/er-tables/README.md` for reproducible commands and precise limitations. Frozen preview: http://127.0.0.1:34466/. Actual GraphvizParser and saved-model loading preserve seven field segments. Browser checks validate row alignment, self-loop, parallel segments, long field text, XState hover/focus, two independent figures, both themes and native zoom/fit. Existing layouts suite: 24/24. No production renderer/model/DSL files changed. Dragging, cardinality markers, aggregation/composite identity and walkthrough coordination are not proved by this spike.

## Preview revision 2 (2026-09-25)

User accepted the first appearance and requested table dragging and green direction animation. Implemented in the isolated preview at http://127.0.0.1:34467/; v1 remains on 34466. Tests cover independent movement without canvas panning, correct row endpoints during/after dragging, self-loop translation, both figures, particle motion, pause, reduced motion and scoped marker IDs. The viewport-local SVG adapter is a prototype; production edge registration, editor history and persistent manual-layout integration still belong to Tasks 4–6.
