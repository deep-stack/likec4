# Native Decision Flowcharts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the supplied decision flowchart natively in LikeC4.

**Architecture:** Extend ordinary element views with two shapes and optional branch metadata on relationships. Preserve branches through DSL, model computation, Graphviz layout, saved models, and the existing React canvas.

**Tech Stack:** TypeScript, Langium, Graphviz, React/XYFlow, Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-28-native-decision-flowcharts-design.md`

## Global Constraints

- Use the existing LikeC4 canvas, layout pipeline, themes, and controls.
- Do not add a second diagram renderer or a DMN model.
- Preserve older models and ordinary diagram behavior.
- Use Node 22.22.3 or newer and `pnpm generate` after grammar and preset changes.
- Follow the repository's branch, commit, changeset, and PR instructions.

## Review Focus

- Two differently labeled branches to the same target remain two edges.
- A projected summary relationship does not claim a specific branch outcome.
- Quoted and escaped branch labels survive DSL round trips.
- Long question text remains inside its diamond and legible.
- Saved layouts and both color schemes retain branch labels and shape geometry.

---

### Task 1: Branch contract and round trip

**Files:** `packages/core/src/types/model-logical.ts`, `packages/core/src/types/view-computed.ts`, `packages/core/src/builder/_types.ts`, `packages/core/src/compute-view/element-view/utils.ts`, `packages/core/src/compute-view/utils/view-hash.ts`, `packages/language-server/src/like-c4.langium`, `packages/language-server/src/model/parser/ModelParser.ts`, `packages/language-server/src/validation/*`, `packages/generators/src/likec4/{operators,schemas}/model.ts`, and focused specs.

**Interfaces:** `DecisionBranch = { readonly label: string }`; relationship property `decisionBranch?: DecisionBranch`; DSL relation entry `branch String`.

- [ ] Write failing parser and computed-view tests for labeled parallel branches, empty/duplicate labels, and projection.
- [ ] Run the focused tests and confirm failure from missing branch support.
- [ ] Add the contract, grammar/parser/validation, computed-edge preservation, Builder type, and view hash.
- [ ] Write a failing DSL round-trip test with quoted branch labels; implement schema and emitter support.
- [ ] Run focused tests, regenerate Langium sources, and confirm the tests pass.

### Task 2: Native shapes and layout

**Files:** `styled-system/preset/src/defaults/types.ts`, `packages/language-server/src/like-c4.langium`, `packages/layouts/src/graphviz/DotPrinter.ts`, `packages/diagram/src/base-primitives/element/ElementShape.tsx`, `packages/diagram/src/context/IconRenderer.tsx`, `styled-system/preset/src/recipes/elementNodeData.ts`, syntax grammars, exporters, and focused specs.

**Interfaces:** element shapes `diamond` and `pill`; visible branch text uses the existing computed edge label.

- [ ] Write failing layout and language completion tests for diamond and pill shapes.
- [ ] Run the focused tests and confirm the missing shapes fail.
- [ ] Register both shapes, draw native SVG outlines, size text, set Graphviz shapes, and update icons and syntax highlighting.
- [ ] Map both shapes in Mermaid, D2, PlantUML, and DrawIO exporters without losing branch labels.
- [ ] Regenerate preset and parser sources; run focused layout, diagram, generator, and language tests.

### Task 3: Example and final verification

**Files:** `examples/decision-flowchart/*`, `.changeset/*.md`, and relevant documentation.

**Interfaces:** A `.c4` example reproducing the supplied six-node scenario with two decisions and four labeled branches.

- [ ] Add the example source and an integration test that compiles it to a layouted model.
- [ ] Run the integration test and inspect a rendered preview in light and dark themes.
- [ ] Run `pnpm generate`, `pnpm typecheck`, `pnpm test --no-typecheck --testTimeout=30000`, `pnpm build`, and scoped lint.
- [ ] Add the patch changeset, review the diff against the spec, commit with a plain one-line message, update from `origin/main`, and open a PR against `main`.
