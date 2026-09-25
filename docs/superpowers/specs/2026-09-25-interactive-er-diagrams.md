# Interactive ER diagrams in LikeC4

Status: compatibility spike approved and implemented; visual preview awaiting review before production wiring.
Branch: `feature/interactive-er-diagrams`.
Base: `33dbc2d34` (`main`, synced before branching).

## Outcome

Render ER tables and field-level relationships inside the existing LikeC4 viewer. Hovering a table highlights that table, its immediate neighbours, and their connecting relationships. The viewer keeps LikeC4's theme, controls, navigation, source actions, and interaction state.

The reference is the user's Liam screenshot and the saved Webharvest comparison at http://127.0.0.1:34465/. The original four-table example contains 21 fields and one relationship. It is the fidelity fixture, not the sole test of correctness.

## Scope

- A native `table` shape with a header and structured field rows; names, types, and supplied key/nullability information remain inspectable.
- Relationships reference fields rather than node centres, including multiple foreign keys, self-references, and paired composite-key columns.
- Explicit endpoint cardinality, including unknown cardinality. Do not infer optionality from missing metadata or manufacture ownership relationships.
- Immediate-neighbour highlighting on hover and keyboard focus. Leaving clears transient highlighting without losing existing selection/navigation state.
- Existing architecture, deployment, and sequence behaviour remains unchanged for diagrams without tables.
- Both light and dark LikeC4 themes, embedded reader usage, and saved/offline layout consumption.

Not included: Liam's full viewer, its sidebars, schema importers, search palette, exports, diff UI, hosted services, recursive path tracing, or new decision-chart support. User requested directional green animation on 2026-09-25 after reviewing the first preview. Provide optional pausable flow particles that respect reduced motion. ER edges express data relationships, not chronological execution or live traffic.

## Approach

Pre-implementation audit: `docs/superpowers/audits/2026-09-25-liam-integration.md`. Confirmed source-conversion defects mean we will not copy Liam's schema conversion or cardinality inference. Its leaf renderers are internal exports; source adaptation is deliberate. Run the real LikeC4 row-port/multiple-figure compatibility spike before DSL/model expansion. Namespace SVG definitions per figure and do not import Liam's URL-state provider.

Selectively adapt Liam's field-row handles and adjacency-highlighting algorithm. Do not add `@liam-hq/erd-core` as a runtime dependency. Its components are coupled to Liam stores, CSS modules, and its own React Flow canvas; embedding that canvas would retain two interaction systems.

Keep one LikeC4 canvas and XState machine. Use the existing custom-node capability for the first visual checkpoint, then register a native table shape. The appearance follows LikeC4 style tokens, typography, focus treatment, and toolbar placement. Do not reproduce Liam's dark theme or green glow as hard-coded styles.

Retain Graphviz for the first implementation. Introduce table-aware dimensions and named field ports in its input and preserve resulting endpoints in saved layout data. This fits ngin8r's existing compile-then-render pipeline. If the real WASM layout probe cannot produce correct field ports, stop that task and record the observed failure before choosing another layout strategy; do not silently add a second browser layout engine.

## Data contract

Add optional structured table data to model elements and computed nodes, and optional table-relationship data to model relationships and computed edges. Optional additions preserve loading of old models.

```ts
export interface TableField {
  readonly id: string
  readonly title: string
  readonly type: string
  readonly nullable?: boolean
  readonly keys?: readonly ('primary' | 'unique')[]
}
export interface TableDefinition {
  readonly fields: readonly TableField[]
}
export interface TableEndpointCardinality {
  readonly min: 0 | 1
  readonly max: 1 | 'many'
}
export interface TableRelationship {
  readonly pairs: readonly {
    readonly source: string
    readonly target: string
  }[]
  readonly sourceCardinality?: TableEndpointCardinality
  readonly targetCardinality?: TableEndpointCardinality
}
```

Element and computed-node property: `table?: TableDefinition`. Relationship and computed-edge property: `tableRelation?: TableRelationship`. A field ID is local to its table; the element's fully qualified ID plus field ID identifies it globally. Foreign-key icons derive from relationship targets, not from another contradictory boolean. Arrays of pairs identify one logical composite relationship; do not infer uniqueness from membership in a larger unique key. The first version displays supplied field key markers and relationship pairs; it is not a database constraint inference engine.

Validation rejects duplicate field IDs, absent endpoint tables/fields, empty or duplicate pairs, table data on non-table shapes, and unsupported table-data overrides. Missing nullability/cardinality stays unknown. View computation must not aggregate different field connections into one misleading table edge. If an endpoint is abstracted into a compound ancestor, retain an ordinary summary edge without pretending it terminates at a field on that ancestor.

The planned DSL spelling is additive and uses explicit blocks:

```c4
specification { element record }
model {
  requests = record 'Requests' {
    style { shape table }
    table {
      column id 'text' { primaryKey }
    }
  }
  attempts = record 'Attempts' {
    style { shape table }
    table {
      column id 'bigint' { primaryKey }
      column request_id 'text' { nullable false }
    }
  }
  requests -> attempts 'has' {
    tableRelation {
      pair id -> request_id
      sourceCardinality one
      targetCardinality zeroOrMany
    }
  }
}
views { view records { include * autoLayout LeftRight } }
```

Each `column` has an identifier, a quoted type label, and optional `title`, `primaryKey`, `unique`, and `nullable true|false` properties. Multiple `pair` entries express a composite reference. Cardinality tokens are `one`, `zeroOrOne`, `many`, and `zeroOrMany`; absence means unknown. `many` means one-or-more. These tokens describe the number of instances at each end, not arrow direction. Add SDK builder support for the same data rather than requiring consumers to serialize metadata strings.

## Rendering and layout

Use a shared table-geometry helper to calculate header, row, and total dimensions from the same style inputs used by the renderer. Preserve every field; do not use the generic description's line clamp. Long labels need bounded wrapping and accessible complete text. Initially tables show all fields; there is no key-only mode or internal row virtualization.

Store field-port geometry in layouted node data so offline readers need not run Graphviz. Resolve user IDs to generated safe port identifiers, not raw DOT/HTML fragments. Escape labels. Route distinct field pairs separately while preserving their logical relationship ID. Cardinality markers apply to the logical relationship; avoid implying independent constraints for composite pairs. Self-loops must leave and return to the correct rows.

LikeC4's edge registry and normal precomputed edge paths need an explicit table-edge path. Adding React Flow handles alone will not relocate the saved spline. Do not expose arbitrary edge-renderer APIs solely to support this feature; keep the first table edge implementation native and focused.

## Interaction

A pure helper computes highlighted node/edge sets from visible relationships. Table hover/focus feeds LikeC4's machine; the renderer consumes derived flags. Ordinary mouse hover must not mutate the saved model, trigger navigation, or overwrite an active walkthrough. Clear table-hover state on view replacement and node removal. A disconnected table highlights only itself. Related nodes with multiple parallel relationships highlight all incident connections, not unrelated connections between its neighbours.

Directional green particles are requested in the updated preview; provide pause and reduced-motion support. Provide keyboard-equivalent focus highlighting and honour reduced-motion settings for any transitions. Existing source actions remain available; field IDs must be exposed for a later ngin8r field-to-source binding without adding a second inspector.

## Compatibility and packaging

Include tables and field endpoints in model serialization, view hashing, and layout drift detection. Adding/removing/reordering/resizing fields or changing endpoint pairs invalidates affected geometry. Colour-only changes can reuse geometry when font/size metrics do not change. Never apply a cached spline to different field rows. Old saved models continue using their existing rendering.

Update syntax highlighting, editor completions, DSL generation, shape icons, and all exhaustive shape mappings. Native DSL round-trip retains table data. Other exporters must either preserve supported table information or report an explicit unsupported representation; do not silently lose fields.

If Liam source is copied, preserve its source license/attribution and record upstream paths and commit `c89f31d45` in a provenance note. Keep this separate from Git commit/PR attribution footers, which the user prohibits.

## Acceptance

1. The four-table fixture preserves all 21 fields, four primary-key markers, two unique markers, and one declared relationship; credential tables stay disconnected.
2. A multi-table fixture demonstrates branching relationships, two FKs to the same table, a self-reference, a composite reference, unknown metadata, and a long table.
3. Hover/focus highlights exactly the active table, immediate neighbours, and incident connections. Leaving restores the previous state.
4. Connections meet their intended rows after layout, resizing, dragging where enabled, and loading a saved model.
5. Both themes use LikeC4 controls; no Liam toolbar or separate canvas appears.
6. Existing architecture/sequence fixtures pass unchanged.
7. A new persistent ngin8r comparison demonstrates the fork. Existing ports 34464 and 34465 and their frozen artifacts remain unchanged.

## Review checkpoints

First review this written design and its implementation plan. Then review a visual table sketch before wiring the complete shape/model pipeline. The sketch is an isolated example using custom node rendering, not a replacement of an existing production shape. The reference image is already supplied; proposed shape name is `table`.

The repository shape skill's registration checklist is useful, but its instruction to hijack an existing shape is not necessary for an isolated custom-node example. This plan deliberately preserves existing shape behaviour while obtaining the same visual review.
