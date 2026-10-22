# Native state transition diagrams in LikeC4

## Intent

ngin8r draws a system's diagrams with LikeC4, except state diagrams, which it
still draws with Mermaid. They look and behave differently from every other
diagram on the page: different styling, a static image, no pan and zoom, no
dark theme, no click-through to evidence. Add native state transition diagrams
to this fork, as was done for ER, decision and class diagrams, so ngin8r can
draw lifecycles with LikeC4 too.

Follow the UML definition of a state machine diagram. Keep LikeC4's layout
pipeline, themes, navigation, zoom, source actions and saved-model reader; this
is an element view like the others, not a separate diagram engine.

The work happens in two steps: this fork first, released as a new
`@deep-stack/likec4` version; then ngin8r moves to that version and its
`lifecycle()` renderer writes LikeC4 instead of Mermaid (see the last section).

## Goals

The first version draws the core of a state diagram:

- **Initial state:** a small filled dot with no title.
- **Final state:** a bullseye (a ring around a filled dot) with no title.
- **Simple state:** a compact rounded box with the state's name.
- **Transition:** a directed arrow labelled `trigger [guard] / effect`; each
  part is optional. The guard is set apart visually, as in the agreed mockup.

The agreed mockup is
[2026-10-22-native-state-diagrams-mockup.png](2026-10-22-native-state-diagrams-mockup.png),
hand-drawn, not a render. It fixes: the dot and bullseye, compact rounded
states, LikeC4's usual dark edge-label chips, and the guard in a distinct
colour inside the label. Exact sizes, proportions and label placement are the
builder's call, as long as the result reads like the mockup.
- **Self-transition:** an arrow that leaves a state and returns to it, with its
  label.

A state that a lifecycle ends in (Succeeded, Failed) is an ordinary state with
an unlabelled transition to a final state, as UML defines it. It is not styled
differently. A diagram may have several final states.

## Non-goals

Not in this version: state activities (`entry / do / exit` inside a box),
nested or composite states, orthogonal regions, choice and junction points,
fork and join bars, history and terminate pseudostates, and state machine
playback or simulation. ngin8r does not record any of these today. The design
should not block adding them later.

## Model and DSL

- Add three element shapes: `state`, `initial` and `final`. A `state` is a
  rounded rectangle, smaller by default than a normal element. `initial` and
  `final` are small fixed-size circles that never show a title, description or
  technology, whatever the element has.
- Add an optional `stateTransition: { trigger?, guard?, effect? }` to model and
  computed relationships. In DSL, spell it as a relationship body block:

  ```c4
  running -[transition]-> queued {
    transition { trigger 'error' guard 'retries left' effect 'back off' }
  }
  ```

  At least one of the three must be non-empty, except on the transition out of
  an initial state and into a final state, which may have none. Those are
  written as plain relationships; an empty `transition {}` block is also
  accepted.
- `transition` in `-[transition]->` is an ordinary relationship kind that the
  model declares, like `flow` in decision examples; the fork adds no built-in
  kind. What makes a relationship a transition is the `transition` block or,
  for the unlabelled ones, the shape of its ends.
- The edge label is built from the parts as `trigger [guard] / effect`. When a
  relationship also has a plain title, the transition parts win.
- Allow self-relationships that carry `stateTransition`, the same way
  `supportsSelfRelationship` already allows them for table, decision and UML
  relationships. Keep parallel transitions between the same two states
  distinct.
- Preserve transition data in parsed models, computed views, saved models,
  layout hashes, LikeC4 DSL round trips and saved manual layouts, as the
  decision branch does. Older models remain valid.

### Validation (warnings, like decision validation)

Initial and final states are recognised by their resolved shape, as
`checkDecisionElement` does for decisions, and every relationship counts,
whether or not it has a `transition` block.

- An initial state has no incoming transitions and exactly one outgoing
  transition, which has no trigger or guard.
- A final state has no outgoing transitions.
- A transition between two states has a trigger, a guard or an effect.

## Layout and rendering

- Graphviz lays out the normal element view. Give `initial` and `final` small
  fixed circle geometry, and `state` rounded-box geometry sized to its name.
- Draw the shapes in LikeC4's native element renderer. The dot and bullseye use
  the theme's foreground colour, so they are dark in the light theme and light
  in the dark theme. States use the element's colour, blue by default.
- Self-loops must leave and re-enter the same box with a visible curve, and
  their labels must not overlap the box. Graphviz supports loops, but nothing in
  this fork draws a labelled loop on a plain element yet. **Prove this first**
  with a throwaway check of `GraphvizParser` output and the edge renderer before
  building the rest; if it cannot be made legible, stop and report.
- Render the transition label with the existing relationship label, showing the
  guard in a distinct colour that works in both themes.

The acceptance fixture is the WebHarvest scrape request lifecycle from the
mockup:

- the initial state leads to Queued;
- Queued leads to Assigned on `worker claims it`;
- Assigned leads to Running on `worker starts`, and back to Queued on
  `lease expires`;
- Running loops to itself on `heartbeat / extend lease`;
- Running goes back to Queued on `error [retries left] / back off`;
- Running leads to Succeeded on `capture saved`, and to Failed on
  `error [no retries left]`;
- Succeeded and Failed each lead to a final state.

Lay it out top to bottom. It must read clearly in both themes and at page width.

## Compatibility and verification

- Update syntax highlighting, shape icons, completion and the exporters, with
  the same rule as decisions: an exporter keeps the state notation and labels,
  or reports an explicit unsupported-export error.
- Verify parsing and validation, parallel and self transitions, DSL round trips,
  Graphviz layout of the three shapes and of self-loops, saved model rendering,
  both colour schemes, and that architecture, sequence, ER, decision and class
  views are unchanged.
- Add an `examples/state-diagram/` project with the fixture, and a patch
  changeset. Do not change the published ngin8r dependency in this PR.

## Then, in ngin8r

After the fork is released, a separate ngin8r change:

- moves to the new `@deep-stack/likec4` version;
- changes `lifecycle()` in
  `packages/plugin/skills/ngin8r/scripts/explorer_render.py` to emit a LikeC4
  view with `renderer: "likec4"` instead of Mermaid `stateDiagram-v2`. It keeps
  the same states, transitions, bindings and text alternative. `initialStates`
  become transitions from an initial state, a `terminal` state gets a
  transition to a final state, and `trigger`/`guard` fill the transition block.
  ngin8r records no effect, so its diagrams show `trigger [guard]` only;
- updates the diagram guide (`mermaid.md`, `native-diagrams.md`) so states are
  a LikeC4 family, and rebuilds the reader bundles.

Lifecycles in docs that were already generated keep their Mermaid diagrams;
only new generations use LikeC4.
