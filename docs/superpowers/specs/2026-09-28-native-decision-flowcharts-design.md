# Native decision flowcharts in LikeC4

## Intent

Render the supplied decision-flow example on the existing LikeC4 canvas. A question uses a diamond, an action uses a rounded pill, and outgoing branches carry visible labels such as `Yes` and `No`. Keep LikeC4's layout pipeline, themes, navigation, zoom, source actions, and saved-model reader.

The first version covers directed decision flows. It does not add DMN dependency diagrams, rule evaluation, branch-choice playback, or a separate diagram engine. A flow may rejoin or loop; this version does not impose tree-only rules.

## Model and DSL

- Add `diamond` and `pill` element shapes. Existing rectangles remain available for actions when desired.
- Add an optional `decisionBranch: { label: string }` to model and computed relationships. In DSL, spell it `branch 'Yes'` inside a relationship body. In the Builder, expose the same property.
- Render a branch label as the edge's visible label. Reject empty and duplicate `branch` properties in DSL. Keep each direct branch relationship distinct, including parallel branches to the same target. If an endpoint is abstracted into a compound node, drop the branch marker and show an ordinary summary edge.
- Preserve branch data in parsed models, computed views, saved models, layout hashes, and LikeC4 DSL round trips. Saved manual layouts match parallel branches by label when generated edge IDs change, and receive edited branch metadata. Older models remain valid.

## Layout and rendering

Graphviz lays out the normal element view. Give it diamond geometry for questions and a rounded-rectangle outline for pill actions. Draw the same shapes in LikeC4's native element renderer, with text legible in both themes and at narrow widths. Use the existing relationship renderer for labeled arrows and existing canvas interactions.

The supplied example is the visual acceptance fixture: `Identify issue` leads to `Impacting deliverables?`; its `No` branch leads to `Continue with current migration`, and its `Yes` branch leads to `Can it be solved internally?`; that question's `No` branch leads to `Escalate to project sponsor`, while `Yes` leads to `Log issue and monitor`. Prefer top-to-bottom layout and legible branch placement. Left/down branch orientation is a visual goal, not a semantic requirement of the data model.

## Compatibility and verification

- Update syntax highlighting, shape icons, completion, and format exporters. Exporters must retain decision notation and branch labels or report an explicit unsupported-export error. Mermaid uses stadium shapes for pills; D2 pills and PlantUML decision shapes are currently rejected.
- Verify parsing and validation, Builder input, parallel branch preservation, DSL round trips, Graphviz node and edge layout, saved model rendering, both color schemes, and architecture/sequence regressions.
- Add an example project and a patch changeset. Do not alter the published ngin8r dependency in this PR.
