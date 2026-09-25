# Liam reuse audit before implementation

Inspected Liam commit `c89f31d45` and LikeC4 base `33dbc2d34`. Planning commit `aad54edfc` completed despite the interrupted tool turn. No product implementation is included in this audit.

## Decision

Selective source adaptation is feasible. Importing the complete `@liam-hq/erd-core` package is not the integration boundary we want. Do not reuse Liam's schema conversion or cardinality inference unchanged. Reuse the immediate-neighbour algorithm and the design of field rows/handles, implemented against LikeC4's state/model/style contracts.

## Confirmed findings

| Finding | Evidence | Consequence / resolution |
|---|---|---|
| Leaf renderer components are not public exports | A source export-graph build reports no `TableNode`, `TableColumn`, or `RelationshipEdge`; package.json exposes only `.` and `./nextjs` | Package-root imports cannot supply these pieces. Adapt source into the fork; do not rely on unsupported deep imports. |
| Helpers and complete renderer are public | `ERDRenderer`, `ERDContent`, `ErdRendererProvider`, `highlightNodesAndEdges`, `convertSchemaToNodes`, and `computeAutoLayout` are exported | Public does not mean independent or correct for our use case. |
| Components require Liam contexts | `TableNode` reads editing context; header/rows read schema and diff contexts; renderer also needs version context and its own React Flow provider | Strip these dependencies from adapted primitives. Keep LikeC4's existing provider and state owner. |
| State is page-global through URL parameters | `UserEditingProvider` uses `active`, `hidden`, `showMode`, history pushes, and explicitly clears `location.hash` on selection | Copying it would interfere with ngin8r section anchors and multiple diagrams. Do not import this provider. |
| Theming is not just a few colours | CSS modules import Liam UI globals, variables, global popper styles; table glow includes fixed green RGBA | Reimplement styles through LikeC4 tokens and focus conventions. Do not import Liam global CSS. |
| Dependency versions differ | Liam uses React 19.1.1 and React Flow 12.8.6; LikeC4 pins React 19.2.8 and React Flow 12.11.6 | Compile adapted primitives against LikeC4's versions. Do not install a second React/React Flow dependency tree. |
| Browser layout lifecycle differs | Liam waits for measured DOM nodes, then runs ELK; LikeC4 compiles Graphviz positions into saved models | Porting Liam's layout hook does not satisfy offline saved layouts. Retain LikeC4's pipeline. |
| Only one source column retained per table | Runtime conversion of a composite reference creates two edge sourceHandle IDs but node data retains only the last `sourceColumnName`. `TableColumnList` renders a source handle only on that matching row | Use a set/map of all field ports and preserve pair identity. This is a blocker to unchanged conversion reuse. |
| Cardinality inference is incorrect for a larger unique key | Runtime test: FK(parent_id), UNIQUE(parent_id, other) returns ONE_TO_ONE although parent_id alone is not unique | Use explicit supplied cardinality. Any future inference needs exact constraint semantics and independent tests. |
| Invalid composite pairs are truncated | Runtime test: two FK columns and one target column produce one relationship, using Math.min | Reject mismatched pairs before view compilation; never silently drop a relationship field. |
| Optionality is not fully represented by Liam edges | Relationship type distinguishes only ONE_TO_ONE/ONE_TO_MANY; rendered markers always use zero-or-one at the source and zero-or-one/many at the target | Use explicit cardinality at both ends, including unknown. Do not copy markers as-is. |
| Multiple figures can collide in SVG definitions | Static IDs such as `zeroOrOneRight` and `myGradient` are referenced by edges | Namespace definitions per mounted LikeC4 diagram, and test two ER figures on one page. |
| Unknown metadata cannot be preserved naturally in Liam's column model | `notNull` is required rather than an optional three-state attribute | Keep our optional nullable field; omission must not become nullable or required. |
| Hover edges include animation code | Six SVG animateMotion particles are rendered for highlighted edges | Omit particles; use LikeC4 highlighting and reduced-motion handling. |
| Foreign-key icon detection is too broad for arbitrary referenced fields | Liam uses source-handle presence as an FK icon fallback when the field is not a PK | In LikeC4 distinguish reference targets from referencing fields; a referenced unique field is not necessarily an FK. |
| Package root is source-oriented | erd-core exports source TS and ships workspace dependency references, CSS modules and UI dependencies | Export-graph analysis is not proof of a ready-made SDK binary or of successful integration into LikeC4's build. No SDK package dependency is proposed. |

## Executed probes

`liam-probes/probe.cjs` and `results.json` contain:

- Export inventory produced by bundling the public source entry. External packages were left external and CSS was replaced with empty modules for this inventory only. This is not an application bundle test.
- Unmodified highlighting helper transpiled with equivalent constants/type guard: hover A in A–B, A–C, B–C highlights A/B/C and only A–B/A–C.
- Actual relationship helper bundled with its real validation dependency: superseding unique constraint incorrectly reports one-to-one; unequal pair counts are truncated.
- Unmodified node-conversion function with actual relationship conversion injected: composite pair edges refer to both columns, but source node data only retains the last one.

`liam-probes/graphviz.cjs` and `graphviz-results.json` use `@hpcc-js/wasm-graphviz` 1.22.2, matching LikeC4's lockfile. The direct WASM run successfully produces two distinct row-port connections and a self-loop, with y-inverted JSON coordinates. It establishes engine support, not correctness of LikeC4's parser/renderer integration.

These scripts use existing local tool/dependency paths. No dependencies were installed, and neither the Liam checkout nor production LikeC4 code was modified. The scripts may need path adjustments on another workstation.

## Source navigation

All Liam paths are relative to its checkout:

- `frontend/packages/erd-core/package.json` and `src/index.ts`: public entry points and dependency versions.
- `frontend/packages/erd-core/src/features/erd/components/ERDContent/components/TableNode/`: row rendering, context coupling, and source-handle selection.
- `frontend/packages/erd-core/src/features/erd/utils/highlightNodesAndEdges.ts`: adjacency algorithm.
- `frontend/packages/erd-core/src/features/erd/utils/convertSchemaToNodes.ts`: singular source-column mapping.
- `frontend/packages/schema/src/utils/constraintsToRelationships.ts`: pair truncation and cardinality inference.
- `frontend/packages/erd-core/src/stores/userEditing/Provider.tsx`: URL/hash effects.
- `frontend/packages/erd-core/src/features/erd/components/ERDRenderer/`: complete canvas/UI, global markers, controls.
- `frontend/packages/erd-core/src/features/erd/utils/computeAutoLayout/`: measured DOM geometry and ELK.

## Remaining proof required before full implementation

The source audit cannot establish these without executing a narrow integration spike. Move them before parser/DSL expansion:

1. Mount a minimal row node inside the real LikeC4 viewer with its installed React Flow version; prove the existing provider/control path works.
2. Carry Graphviz field ports through LikeC4's actual JSON parser and one saved layout, and verify endpoints against rendered row rectangles in both themes.
3. Mount two figures simultaneously; demonstrate independent hover state, unique SVG IDs, and unchanged document hash/history.
4. Exercise self-loop, composite pair, parallel FKs, and long labels in that small harness. Verify hover/focus exit restores selection and does not break existing walkthroughs.

No application dependencies are installed in the LikeC4 checkout at this point. The direct engine/helper probes used already available dependencies elsewhere. Therefore a full compiler/typecheck/browser integration has not been verified. Dependency setup and the above spike are prerequisites, not tasks deferred until the end.

## Provenance

Liam's root LICENSE and package manifests identify Apache-2.0. No root NOTICE file was present in this checkout. Preserve applicable license/source notices for any copied files and document changes and upstream paths. This audit does not claim that the entire fork can be relabelled MIT. Existing repository contribution/commit conventions remain unchanged.

## Confidence and limit

The small behaviour we need is implementable without Liam's package API: table rows, explicit field connections, and neighbour highlighting. The blockers above change what we reuse, not whether the feature is possible. A zero-surprise implementation cannot be guaranteed by reading source. The remaining uncertainty is explicitly concentrated in the early integration spike rather than hidden in later tasks.
