# Native class diagrams

Status: proposed design for review; implementation has not started.
Branch: `feature/class-diagrams`, based on `main` at `07eb2c83f`.
Decision-chart PR #2 remains independent. Do not push, open a PR, or merge without the user's instruction.

## Outcome and scope

Implement the complete class-diagram feature set agreed in this conversation using LikeC4's existing DSL, typed model, layout pipeline and canvas. A feature is supported only when it survives authoring, model computation, layout, rendering and DSL round trips. Merely accepting metadata does not meet this requirement.

The target is the agreed UML class-diagram notation, not certification as a complete UML modeling tool. Use the [OMG UML 2.5.1 specification](https://www.omg.org/spec/UML/2.5.1) to verify notation and constraints during implementation. OCL constraints are displayed as authored text; parsing or executing OCL, source-code generation, reverse engineering, XMI interchange and other UML diagram types are outside the agreed scope.

## Architecture choice

Use structured classifier and association data in the existing model. Keep UML semantics separate from visual shapes, colors and labels. Extend normal element views rather than introducing a parallel diagram engine.

Alternatives considered:

- Encoding members in descriptions and arrow styles is insufficient: no reliable validation, filtering, identity or semantic round trips.
- An embedded external UML renderer would fragment navigation, evidence actions, manual layout and theme behavior.
- Typed native support costs more initially but provides one implementation contract across the existing LikeC4 layers. This is the chosen approach.

### Existing extension points

- Core model types, Builder, computed nodes/edges and serialization live in `packages/core`.
- The ER precedent is `packages/core/src/types/table.ts`; it demonstrates structured metadata, but class semantics should not be encoded as table fields.
- Grammar, parsing, validation, formatting and completions live in `packages/language-server`.
- Graphviz printing/parsing lives in `packages/layouts/src/graphviz`.
- `packages/diagram/src/likec4diagram/custom/nodes/nodes.tsx` owns native element controls. Extract reusable content/chrome boundaries here so class compartments retain details, tags, notes, navigation, drift controls and read-only behavior.
- DSL emission lives in `packages/generators/src/likec4/operators/model.ts`. Each other exporter must independently account for UML semantics.
- Use the current fork's package names and release conventions from main. Do not bring in PR #2 or broaden this work into ngin8r adoption.

## Feature contract

| Area | Required behavior |
| --- | --- |
| Classifiers | Classes, abstract classes, interfaces, enumerations, data types, primitive types; stable IDs and custom stereotypes |
| Templates | Generic type parameters, bounds, defaults, and bindings; retain text for external types without inventing referenced classifiers |
| Structure | Nested types and packages, package nesting, classifier ownership distinct from what a view displays |
| Attributes | Stable ID, display name, type, visibility, default, multiplicity, static, derived, read-only, ordered/unique properties and constraints |
| Operations | Stable ID, display name, parameters, return type/multiplicity, visibility, static/abstract, constructor notation, overloads, properties and constraints |
| Parameters | Name, type, direction (`in`, `out`, `inout`, `return`), defaults, multiplicity and properties |
| Compartments | Name, attributes and operations; enumeration literals and named extra compartments; view-level member filtering and compartment visibility |
| Associations | Binary and self associations, parallel associations, endpoint roles/multiplicities, navigability/non-navigability, qualified associations, association classes and n-ary associations |
| Other relationships | Generalization, realization, dependency, aggregation and composition; appropriate line and marker semantics |
| Generalization sets | Stable grouping of generalizations, disjoint/overlapping and complete/incomplete annotations |
| Annotations | Notes, comments, stereotypes and constraints attached to classifiers, members and relationships |
| Interaction | Standard canvas controls, accessible member/compartment inspection, collapsible compartments, source navigation and read-only behavior |
| Persistence | All stages, saved models, manual layout reuse and semantic DSL round trips |

All rows are acceptance requirements for this feature, not a backlog to silently omit from the initial implementation.

## Typed model and identity

Introduce a discriminated classifier definition rather than a single loosely typed metadata bag. Give every member, parameter, template parameter, compartment, association end and annotation a stable authored ID separate from its display label. Member targets are identified by classifier FQN plus member ID. Overloaded operations may share a display name; their IDs remain distinct.

Represent types as either explicit model references or authored external type expressions. Resolve only declared references. Do not infer relationships from arbitrary type strings. Template bindings preserve argument order and references.

Represent multiplicity as ordered lower/upper bounds, with an unbounded upper value. Preserve absence as unspecified. Display a single bound compactly and ranges as `lower..upper`; normalize `*` consistently. Validate nonnegative integer bounds and lower <= upper.

Use typed UML relationships with separately typed ends. End metadata includes classifier/member reference, role, multiplicity, navigability, aggregation kind, qualifiers and properties. Source/target order alone must not determine which end is the composite owner. Keep unspecified navigation distinct from explicitly non-navigable.

Binary relationships continue through the existing edge pipeline. N-ary associations have one authored association identity and three or more named ends. Computation lowers them to a junction and incident edges, each retaining its originating association/end IDs. Synthetic graph objects are view artifacts and never leak into DSL exports as authored elements.

Association classes connect a classifier to the logical association through a dedicated attachment, not an invented business relationship. Generalization sets reference stable generalization IDs. Add explicit stable IDs for UML relationships while preserving existing relationship ID behavior for legacy input.

Notes/constraints use typed targets. Avoid modeling annotation links as domain dependencies. Enforce referential integrity when members or relationships are renamed or removed.

## DSL and Builder

Use an explicit `classifier` block inside a normal element body, and an explicit UML block on relationships. The specification's visual shape defaults provide a class compartment shape, while the structured block defines semantic kind. Add dedicated model statements for associations with more than two ends, association-class attachments and generalization sets.

The exact grammar should follow existing LikeC4 block/property conventions and use quoted strings for types and signatures that contain punctuation. Do not embed Mermaid or PlantUML source, or store opaque whole-member signatures that cannot be validated or selectively displayed.

A representative proposed syntax (not yet executable):

```c4
specification {
  element type { style { shape class } }
}
model {
  customer = type 'Customer' {
    classifier {
      kind class
      attribute id 'id' {
        type 'UUID'
        visibility private
        readOnly true
      }
      operation find 'find' {
        visibility public
        static true
        parameter key 'key' { type 'UUID' direction in }
        returns 'Customer' { multiplicity '0..1' }
      }
    }
  }
}
```

Provide equivalent Builder APIs and validation for runtime model input. Update syntax highlighting, symbols, completions, hover/help and formatting. Add semantic round-trip tests for each form. Do not hand-edit generated parser files.

## Validation

Report malformed or contradictory semantic data as errors; report incomplete but renderable modeling choices as warnings where appropriate. Share semantic checks between DSL and Builder/model input rather than duplicating inconsistent rules.

Required checks include duplicate stable IDs, missing references, invalid multiplicities, incompatible classifier/member modifiers, invalid realization/generalization endpoints, inheritance cycles, illegal association end combinations and invalid generalization-set membership. Verify UML rules rather than assuming all programming languages share the same restrictions.

Do not reject distinct overloads simply because names match. Reject ambiguous duplicate signatures only where the modeled signature contains enough information to establish duplication. Do not invent type-resolution errors for explicitly external type strings.

Validate project-wide references and refresh affected diagnostics after cross-file edits and deletions. Avoid making ordinary architecture documents pay for unnecessary UML graph analysis: index dependencies and cache analysis at the appropriate document lifecycle stage.

## Computation, layout and canvas

Carry semantic metadata through parsed, computed and layouted models. Include presentation-affecting data in layout hashes. Keep meaningful UML relationships separate when endpoints match; do not collapse inheritance and association into one edge.

When endpoints are summarized by an architectural compound, do not assert classifier-level semantics on the summary edge. Preserve origin references for inspection and expose the summary honestly. Member filtering affects presentation only, never classifier semantics or associations.

Use shared text/compartment measurement for Graphviz and React. Long members wrap without overlapping separators. Reserve space for stereotypes, generic parameters, end labels and qualifiers. Keep role and multiplicity labels attached to their own ends after layout, node movement and saved-layout reuse.

Render static members underlined, abstract classifiers/operations italicized, derived attributes with `/`, and visibility with UML markers. Render hollow/filled diamonds, hollow triangular inheritance/realization heads, dashed dependencies/realizations and explicit navigability correctly. Use a separate association junction geometry without depending on PR #2's diamond shape.

Composition/aggregation markers belong at the whole end; inheritance and realization triangles point to the general classifier/interface. Cover both source/target orientations in tests. An association class uses an attachment to its association path; n-ary association labels remain associated with the proper ends.

Reuse the standard element and relationship interaction wrappers. Implement visual primitives and styles through Panda recipes. Persist view-authored compartment filters through DSL; keep transient user expand/collapse state in the viewer, with coherent edge attachment and node sizing. Keyboard controls and accessible names must expose the same information as pointer interactions.

## Export contract

Native viewer and LikeC4 DSL must cover the full feature contract. DSL round trips preserve semantic identity, not original comments or formatting.

Mermaid, PlantUML, D2 and DrawIO have different expressive limits. Implement an explicit capability check for the actual contents of each view before generating output. Where a format can faithfully represent a feature, emit its native class notation. Otherwise return a precise error identifying the unsupported construct and offer native viewer/DSL. Never silently remove members, qualifiers, association ends or relationship meaning.

Do not advertise full UML export support based on a basic class-box snapshot. Advanced association and annotation fixtures must exercise rejection as well as supported conversion. Saved-model loading and external export validation must inspect semantic metadata even if a view overrides visual shapes.

## Delivery and acceptance

Implement in dependency order, with a reviewable local commit at each coherent step:

1. Model, stable identity, shared semantic validation and Builder contracts.
2. DSL parsing, editor integration and semantic round trips.
3. Computation and layout for classifiers, compartments and binary relationships.
4. Canvas primitives and shared controls, member filtering and accessibility.
5. Qualified/n-ary associations, association classes, generalization sets and annotations across all layers.
6. Format capabilities, native exports, examples, documentation and patch changesets.

Each stage must retain the full agreed scope; a partial intermediate stage is not feature completion. The implementation plan must map every feature-contract row to owners and observable tests before coding begins.

Verification includes model/DSL tests, negative validation cases, cross-document updates, layout geometry and end-label positioning, manual-layout round trips, and browser checks in both themes. Cover self-loops, parallel edges, nested packages, overloads, long signatures, compartment toggling and read-only behavior. Run architecture and ER regression suites, type checking, lint and build gates with the repository's supported Node/pnpm versions.

Create a compact runnable example set: a conventional domain class model, a member/notation showcase, and advanced associations. Every supported feature must have a visible example or focused rendering fixture. Screenshots and successful compilation alone do not establish semantic correctness.

## Review checkpoint

The user has approved the feature checklist and requested implementation. This document makes the architecture and acceptance contract concrete. Under the brainstorming skill's architectural workflow, review this written design before producing the detailed implementation plan; review that plan before beginning code changes.
