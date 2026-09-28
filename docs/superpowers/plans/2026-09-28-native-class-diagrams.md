# Native Class Diagrams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for inline execution, or superpowers:subagent-driven-development if the user selects delegation. Steps use checkbox syntax for tracking.

**Goal:** Deliver every class-diagram capability in the approved design through native LikeC4 authoring, model, layout, canvas and persistence.

**Architecture:** Add typed classifier definitions and UML relationships to the existing model. Give advanced associations explicit semantic identities and lower them to graph primitives only during view computation. Reuse element/edge controls and introduce shared compartment and endpoint-label primitives.

**Tech Stack:** TypeScript, Langium, Graphviz, React/XYFlow, Panda CSS, Vitest and Playwright.

**Spec:** `docs/superpowers/specs/2026-09-28-native-class-diagrams-design.md`

## Global Constraints

- Work on `feature/class-diagrams`, based on main `07eb2c83f`; do not cherry-pick decision-chart PR #2.
- Keep all work local. Do not push, open a PR, or merge without the user's instruction.
- Every feature-contract row in the spec is required; intermediate commits are not completion.
- OCL is authored display text, not executable constraints. No code generation, reverse engineering or XMI support.
- Use Node >=22.22.3 and pnpm 11.25.0. Preserve fork package naming and existing workspace aliases.
- Never hand-edit generated files; run `pnpm generate` after grammar/style changes.
- Preserve untracked `0` and residual `examples/decision-flowchart/`; neither belongs to this branch.
- Existing model JSON without UML fields remains valid; new fields are optional at the model boundary.
- Native canvas and DSL cover the complete scope. Other exports must preserve the represented semantics or return a construct-specific error.
- Use single-line commit messages of at most ten words, with no body or attribution.

## Review Focus

1. Rename/delete a referenced member in another file: stale associations and diagnostics must refresh (Tasks 2, 4).
2. Two associations with the same endpoints and display label: identity, annotations and saved routes remain distinct (Tasks 1, 5, 10).
3. Collapse a compartment after moving its node: labels and connectors must follow current geometry without changing model semantics (Tasks 6, 7).
4. Load old model JSON or a mixed architecture/ER/class view: preserve existing interaction and layout behavior (Tasks 5, 7, 10).
5. Override a class shape or hide a member before export: unsupported semantic data must not evade export checks or disappear silently (Tasks 8, 9).

## Execution and test discipline

For each task, add the specified failing regression first, run that focused file to confirm a behavioral failure, implement its contract, then rerun it. Use existing source-mode imports (`@likec4/core`, etc.) as configured by workspace aliases. Rebuild core declarations before dependent type checks.

Focused command: `pnpm exec vitest run --no-typecheck PATH_TO_SPEC` with the concrete spec path given in each task. Keep the repository timeout settings; do not hide regressions by increasing timeouts. Commit only explicit task paths after inspection.

Before Task 1: verify branch/status, run `pnpm install --frozen-lockfile`, `pnpm generate`, and baseline `pnpm test --no-typecheck`. Record pre-existing failures separately. The main branch recently changed package names, so existing node_modules and generated outputs from PR #2 are not a valid baseline.

## Contract map

Create these focused core modules:

- `packages/core/src/types/uml.ts`: serializable classifier, member, association, annotation and view-presentation types.
- `packages/core/src/uml/identity.ts`: stable scoped IDs and origin identities for synthetic graph objects.
- `packages/core/src/uml/validation.ts`: source-independent semantic diagnostics.
- `packages/core/src/uml/presentation.ts`: member text tokens and UML marker selection, without React or Graphviz dependencies.
- `packages/core/src/uml/index.ts`: public module exports.

Use the following public contracts throughout the tasks:

```ts
interface UmlMultiplicity { readonly lower: number; readonly upper: number | '*' }
type UmlVisibility = 'public' | 'private' | 'protected' | 'package'
type UmlType = { readonly external: string } | { readonly classifier: string }
type UmlTarget =
  | { readonly element: string; readonly member?: string }
  | { readonly relationship: string; readonly end?: string }

interface UmlDiagnostic {
  readonly severity: 'error' | 'warning'
  readonly code: string
  readonly message: string
  readonly target: UmlTarget
}

parseUmlMultiplicity(value: string): UmlMultiplicity
formatUmlMultiplicity(value: UmlMultiplicity): string
umlScopedId(owner: string, localId: string): string
validateUmlModel(model: ParsedLikeC4ModelData): readonly UmlDiagnostic[]
```

`classifier?: UmlClassifier` belongs to model elements and computed nodes. `uml?: UmlBinaryRelationship` belongs to ordinary model relationships. `uml?: UmlModelExtensions` belongs to model data and stores n-ary associations, association-class attachments, generalization sets and annotations. Keep these optional for legacy input.

`UmlClassifier` is discriminated by kind: class/interface/enumeration/dataType/primitiveType/package. It owns stable-ID attributes, operations, template parameters, literals and additional compartments. An attribute owns structured type, multiplicity, default, visibility, modifiers and properties. An operation owns structured parameters and return information. Preserve descriptions, constraints and stereotypes as structured arrays; do not flatten members into a signature string.

`UmlBinaryRelationship` carries a stable authored ID, relationship kind, source/target end data and stereotypes/constraints. End records carry stable IDs, roles, multiplicity, navigation state, aggregation kind, qualifiers and member references. Generalization/realization direction is specific-to-general/implementer-to-contract. Aggregation ownership is explicit end data.

`UmlModelExtensions` gives each advanced construct an authored ID. N-ary associations have an ordered array of named ends. Association-class attachments refer to an existing association and classifier. Generalization sets refer to relationship IDs. Annotations refer to `UmlTarget` records. Synthetic nodes/edges retain `umlOrigin` pointing to authored IDs; they are not stored as authored elements/relations.

## Task 1: Typed data, identity and multiplicity

**Files:** create the core modules above and `packages/core/src/uml/identity.spec.ts`; modify `types/model-logical.ts`, `types/model-data.ts`, `types/view-computed.ts`, `types/index.ts` and core public exports.

**Interface:** produces the contract map, including all member and advanced association records. IDs remain separate from display names.

- [ ] Add a test that fails before the multiplicity/identity helpers exist:

```ts
expect(parseUmlMultiplicity('0..*')).toEqual({ lower: 0, upper: '*' })
expect(formatUmlMultiplicity({ lower: 1, upper: 1 })).toBe('1')
expect(() => parseUmlMultiplicity('3..1')).toThrow()
expect(umlScopedId('domain.Customer', 'findById'))
  .not.toBe(umlScopedId('domain.Customer', 'findByName'))
```

- [ ] Run `packages/core/src/uml/identity.spec.ts`; confirm failure, then implement checked parsing, canonical formatting and collision-safe scoped IDs. Reject negative, fractional, reversed and malformed bounds.
- [ ] Add serialization tests for all classifier kinds, two same-name overloads with different IDs, parameters, generic bindings, association ends and old model JSON without UML fields. Define ordered/unique/readOnly/static/derived/abstract data explicitly; avoid arbitrary modifiers with no rendering contract.
- [ ] Run focused tests and `pnpm exec tsc -b packages/core`.
- [ ] Commit: `add typed class diagram data`.

## Task 2: Shared semantic validation and Builder

**Files:** create `packages/core/src/uml/validation.spec.ts` and `packages/core/src/builder/__tests__/uml.spec.ts`; modify `uml/validation.ts`, `builder/Builder.ts`, `builder/_types.ts`, `model/connection/model/find.ts`.

**Interface:** `validateUmlModel` consumes parsed model data. Builder accepts `classifier` and binary relationship `uml` props; add `withUml(extensions: UmlModelExtensions)` for advanced constructs. Share validation with DSL ingestion.

- [ ] Add a fixture module `packages/core/src/uml/__tests__/fixtures.ts` exporting `validUmlModel()` and `modelWithDuplicateUmlIds()`, both returning `ParsedLikeC4ModelData`. The valid fixture includes interface realization, a recursive association, two overloads, generic parameters and an enumeration.

```ts
expect(validateUmlModel(validUmlModel())).toEqual([])
expect(validateUmlModel(modelWithDuplicateUmlIds()))
  .toEqual(expect.arrayContaining([expect.objectContaining({ code: 'uml.duplicate-id' })]))
```

- [ ] Run `packages/core/src/uml/validation.spec.ts` red, then implement duplicate/reference/multiplicity checks, modifier compatibility, generalization cycles and endpoint legality. Check the UML reference before codifying restrictions. External type strings must not require local classifiers.
- [ ] Add negative fixtures for deleted members, realization to a non-contract classifier, invalid composition ends and generalization sets referencing associations. Accept distinct overloads; do not use names as IDs.
- [ ] Test self/parallel UML associations via Builder while retaining ordinary architecture hierarchy restrictions. Test `Builder.fromParsed` preserves every extension.
- [ ] Run both focused files and core type checking; commit `validate class models and extend builder`.

## Task 3: DSL grammar, parsing and writeback

**Files:** modify `packages/language-server/src/like-c4.langium`, `model/parser/ModelParser.ts`, `model/model-builder.ts`, `packages/generators/src/likec4/operators/model.ts`; create parser/emitter helpers `model/parser/uml.ts` and `packages/generators/src/likec4/operators/uml.ts`; create `packages/language-services/src/__tests__/LikeC4.uml.spec.ts`.

**Interface:** `parseUmlClassifier(node)` produces `UmlClassifier`; dedicated typed parsers produce relationships and extensions. Emitter consumes the exact serialized core types.

- [ ] Author complete executable DSL fixtures under `packages/language-services/src/__tests__/fixtures/uml/`: `members.c4`, `relationships.c4`, `advanced.c4`. Follow the approved classifier-block example, use explicit UML relationship IDs, and use model statements `umlAssociation`, `umlAssociationClass`, `umlGeneralizationSet` and `umlAnnotation` for advanced constructs. Use named end blocks, never a positional string encoding.
- [ ] Add round-trip tests for each fixture:

```ts
const first = await fromSource(source, { throwIfInvalid: true })
try {
  const second = await fromSource(await first.toDSL(), { throwIfInvalid: true })
  try {
    expect((await second.parsedModel()).$data.elements)
      .toEqual((await first.parsedModel()).$data.elements)
    expect((await second.parsedModel()).$data.uml)
      .toEqual((await first.parsedModel()).$data.uml)
  } finally { await second.dispose() }
} finally { await first.dispose() }
```

- [ ] Run the new spec red; implement grammar and parsing/emission for every classifier/member/end field. Add relation equality assertions using stable UML IDs, independent of existing autogenerated relation IDs.
- [ ] Run `pnpm generate`, focused tests and core/language-server/generators type checks. Confirm generated artifacts come from tools.
- [ ] Commit `add class diagram authoring syntax`.

## Task 4: Editor support and diagnostic refresh

**Files:** create `packages/language-server/src/validation/uml.ts`, `src/__tests__/model-uml.spec.ts`; modify `validation/index.ts`, `lsp/CompletionProvider.ts`, `lsp/CompletionProvider.spec.ts`, `lsp/SemanticTokenProvider.ts`, `formatting/LikeC4Formatter.ts` and its specs. Update the syntax-highlighting generator inputs identified by `pnpm generate` and the existing TextMate generation scripts.

**Interface:** translate core diagnostic targets to local AST ranges. Register reference dependencies by referenced classifier/member/association identity, with project-scoped caches.

- [ ] Add a two-file fixture, validate, then delete the file defining a referenced member. Assert `uml.unknown-member` on the referencing declaration after the normal document update, without forcing a manual validation pass. Restore it and assert the diagnostic clears.
- [ ] Add context-sensitive completion tests: visibility only in member contexts, classifier kinds only in classifier blocks, endpoint references limited to applicable symbols. Formatting twice must be idempotent.
- [ ] Run the three focused specs red, implement AST indexing and diagnostic mapping, then rerun. Avoid a project-wide relink for every unrelated architecture edit.
- [ ] Test reserved-word member display names, multiline type text and malformed blocks produce actionable ranges rather than parser crashes.
- [ ] Commit `add class diagram editor support`.

## Task 5: View computation and advanced associations

**Files:** create `packages/core/src/compute-view/element-view/uml.ts` and `uml.spec.ts`; modify `element-view/utils.ts`, node-building paths, `compute-view/utils/view-hash.ts`, `types/view-computed.ts`, `types/view-layouted.ts`, and `manual-layout/applyCachedLayout.ts` where matching requires origin identity.

**Interface:** `computeUmlArtifacts(model, view)` returns synthetic graph artifacts with `umlOrigin`; normal computed nodes/edges preserve classifier and end data. Helpers consume parsed extensions without mutating them.

- [ ] Add fixtures for two associations with identical endpoints/labels, one three-ended association, one association class and a generalization set. Assert stable separate edge identities, one junction per n-ary association, all ends retained and no synthetic artifacts in source model data.
- [ ] Run `uml.spec.ts` red; implement lowering in the existing computation pipeline. Resolve include/exclude through authored origin IDs. A partially shown association must retain honest provenance rather than become a different association.
- [ ] Add a mixed architecture/ER/class view and compound-summary tests. Summary edges must not retain misleading UML classifier-level markers. Alter member visibility and verify presentation hashes change without mutating classifier metadata.
- [ ] Run computation and manual-layout suites; commit `compute native class diagram views`.

## Task 6: Compartment geometry and UML layout

**Files:** create `packages/core/src/geometry/uml.ts`, `uml.spec.ts`, `packages/layouts/src/graphviz/uml-label.ts`, `uml.spec.ts`; modify Graphviz `ElementViewPrinter.ts` and `GraphvizParser.ts` and layouted type definitions.

**Interface:** `measureUmlClassifier(classifier, presentation)` returns header/row/compartment boxes. `umlRelationshipPresentation(relationship)` returns line and endpoint marker semantics. End labels and qualifier rectangles have explicit coordinates in layouted data.

- [ ] Assert static tokens request underlining, abstract tokens request italic text, derived attributes start with `/`, and end ownership selects the correct diamond independently of source order.
- [ ] Add Graphviz tests for all six classifier kinds, long wrapped signatures, self/parallel edges, n-ary junctions, qualified ends and association-class attachments. Assert nonempty edge paths and finite label rectangles at the appropriate end.
- [ ] Run geometry/layout specs red; implement shared measurement and Graphviz HTML labels with escaped authored text. Preserve Unicode and punctuation. Emit hollow/filled markers and dashed/solid lines from semantic data.
- [ ] Test direction reversal and all four view layout directions. Reuse saved node movement while recomputing end-label attachment. Qualifiers must not overlap the class boundary.
- [ ] Commit `lay out class compartments and associations`.

## Task 7: Shared canvas controls and class rendering

**Files:** create `packages/diagram/src/base-primitives/uml/ClassCompartments.tsx`, `UmlEndLabels.tsx`, `packages/diagram/src/likec4diagram/custom/nodes/ElementChrome.tsx`; modify `custom/nodes/nodes.tsx`, `custom/edges/RelationshipEdge.tsx`, `convert-to-xyflow.ts`, shared node/edge types and `styled-system/preset/src/slot-recipes/` exports. Add `e2e/tests/class-diagrams.spec.ts` and its source fixture.

**Interface:** `ElementChrome` owns existing applicable controls around supplied node content. Class content consumes computed data and shared geometry. `UmlEndLabels` consumes layouted end data plus current node offsets; it does not reparse member strings.

- [ ] Add browser assertions for compartments, visibility glyphs, static underline, abstract italics, notes, evidence/source navigation, details and both themes.
- [ ] Add a collapse control test: keyboard activation hides rows, preserves accessible classifier identity, updates node size/edge anchors and restores the same rows when expanded.
- [ ] Implement primitives and recipes, keeping transient collapse state in the viewer. Refactor only the shared controls needed by class nodes; preserve existing architecture/ER behavior.
- [ ] Test dragging under read-only mode, long signatures, dark/light contrast, pan/zoom and nested packages. Move a node and check labels/qualifiers/association attachments track the geometry.
- [ ] Run focused browser tests, recipe generation and diagram type checking; commit `render classes with native canvas controls`.

## Task 8: Per-view presentation and annotations

**Files:** modify DSL view-style grammar, `packages/core/src/types/view.ts` and corresponding style types, classifier computation and DSL emission; create `packages/core/src/uml/presentation.spec.ts` and `packages/language-services/src/__tests__/LikeC4.uml-presentation.spec.ts`.

**Interface:** `UmlPresentation` stores visible compartments and member-ID filters separately from `UmlClassifier`. Annotation targets use `UmlTarget`; annotation display artifacts retain authored origin IDs.

- [ ] Add a two-view test: one hides private members and another shows them. Assert both views use identical source classifier data and that filtered member references remain valid.
- [ ] Add serialization tests for enumeration literals, custom compartments, generic bounds/bindings, notes and constraints attached to members and associations. Assert visible annotation anchors point to the correct origin even after duplicate-label edges are reordered.
- [ ] Run both focused specs red; implement view settings, text formatting and typed annotation adapters. Do not express constraints as executable callbacks.
- [ ] Add browser assertions to Task 7's fixture for all annotation forms and package nesting. Verify hidden targets appear in details without a fabricated visible connection.
- [ ] Commit `add class views and UML annotations`.

## Task 9: Honest format exports

**Files:** create `packages/generators/src/uml-capabilities.ts`, `uml-exports.spec.ts`; modify the existing Mermaid, PlantUML, D2 and DrawIO exporters and DSL emitter only where required.

**Interface:** `checkUmlExportCapabilities(format, view)` returns structured unsupported-construct diagnostics; `assertUmlExportSupported(format, view)` throws a precise error before output. Inspect semantic metadata, not just shape names.

- [ ] Build test fixtures from Task 3 for basic classifiers, advanced associations and a class with a rectangle shape override. Every external format must either emit faithful native notation or fail with a named unsupported construct.

```ts
expect(() => assertUmlExportSupported('mermaid', qualifiedAssociationView))
  .toThrow(/qualified association/i)
```

- [ ] Run `uml-exports.spec.ts` red. Verify each format's primary documentation before mapping capabilities; do not assume support from similarly named arrowheads. Implement basic native class/member and relationship mappings where supported, then advanced mappings with individual tests.
- [ ] Test escaping, static/abstract notation, multiplicity orientation, parallel associations and view-filtered members. Do not silently fall back to architecture rectangles or relation labels.
- [ ] Verify DSL round trips still retain every advanced construct; commit `export class diagrams without losing semantics`.

## Task 10: Acceptance coverage and local completion

**Files:** create `examples/class-diagrams/{domain,members,advanced}.c4`, `examples/class-diagrams/README.md`, `.changeset/native-class-diagrams.md`; extend `packages/core/src/manual-layout/applyCachedLayout.spec.ts`, `packages/language-services/src/__tests__/LikeC4.uml.spec.ts`, and `e2e/tests/class-diagrams.spec.ts`.

- [ ] Add model/layout reload tests covering origin identity, same-label parallel relationships, changed member sizes, old JSON and mixed ER/architecture/class views. Cached layouts must not reintroduce stale semantic data.
- [ ] Make a coverage table in the example README linking every approved feature-contract row to a DSL fixture and observable test. Treat any blank row as unfinished implementation.
- [ ] Run `pnpm generate`, `pnpm typecheck`, `pnpm lint:errors-only`, `pnpm test --no-typecheck`, `pnpm build`, then the repository's Playwright gate. Inspect failures and distinguish environmental blockers from feature failures; do not declare unrun gates passed.
- [ ] Manually inspect the three examples in both themes and verify class details, compartment controls and edge-end meaning. Document format limitations precisely in the README.
- [ ] Add a patch changeset using the current package names for affected public packages. Review the final diff against the feature contract and preserve unrelated files.
- [ ] Commit `document and verify native class diagrams`.
- [ ] Report local commit hashes, completed coverage, test results and any remaining blockers. No push, PR creation or merge.

## Coverage cross-check

Classifiers/templates/attributes/operations/parameters: Tasks 1–4, 6–8. Binary relationships and endpoint details: Tasks 1–6, 7, 9. Association classes/n-ary/qualified associations/generalization sets: Tasks 1–6, 7–10. Packages/annotations/filters/accessibility: Tasks 3–8, 10. Builder, editor, serialization/manual layouts and regressions: Tasks 1–5, 8–10. Export capability failures and native notation: Task 9.

## Review checkpoint

This plan requires user review under the writing-plans workflow before code implementation. Recommend inline execution because the tasks depend closely on shared model identities and presentation contracts. Delegation is optional and requires the user's selection; the default is not to spawn agents.
