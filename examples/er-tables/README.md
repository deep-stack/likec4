# Native ER tables

This example compiles LikeC4 DSL and renders the resulting saved model with the
builtin LikeC4 viewer. It has no custom node/edge overrides and no Liam runtime.

Use Node >=22.22.3 and the repository's pinned pnpm:

```sh
pnpm install --frozen-lockfile
pnpm generate
node --conditions=sources --import tsx examples/er-tables/generate.ts
pnpm --dir styled-system/styles exec pandacss cssgen --outfile ../../examples/er-tables/panda.css
pnpm --dir packages/diagram exec vite --config ../../examples/er-tables/vite.config.ts --port 34468
```

`webharvest.c4` contains the four-table, 21-field source fixture. `stress.c4`
contains synthetic parallel references, a self-reference and a long field name.
The layout integration tests additionally cover composite references. Unknown
nullability is omitted; cardinality is explicitly supplied, never inferred.
Both files also work together as the `er-tables` LikeC4 project.

```likec4
specification { element record { style { shape table } } }
model {
  requests = record { table { column id 'uuid' { primaryKey } } }
  attempts = record { table { column request_id 'uuid' } }
  requests -> attempts {
    tableRelation {
      pair id -> request_id
      sourceCardinality one
      targetCardinality zeroOrMany
    }
  }
}
views { view records { include * autoLayout LeftRight } }
```

Columns support `title`, `primaryKey`, `unique`, and `nullable true/false`.
Identifiers can be quoted. Add multiple `pair` entries for a composite reference.
Endpoint cardinalities are `one`, `zeroOrOne`, `many`, or `zeroOrMany`.
Omitting cardinality leaves its endpoint unmarked. Table data determines row
geometry even when a view applies a general shape style.

Hover or keyboard-focus a table to highlight its immediate neighbours. Six
elliptical particles follow each highlighted connection over six seconds, matching
Liam's animation settings. The viewer enables animation by default and supplies
pause/reset controls. Reduced-motion preferences suppress particles. This
indicates declared relationship direction, not live traffic.

In a read-only artifact, dragging and reset affect the current canvas only;
reload restores the saved positions. Saved manual snapshots keep their original
fields and splines when schema changes are detected, and report drift for review.
D2, Mermaid, PlantUML and DrawIO exports explicitly reject ER tables; use the
LikeC4 viewer or DSL export to retain their field semantics.

`check.cjs` runs Chromium checks for row alignment during dragging, self-loops,
hover, keyboard focus, moving particles, pause, reduced motion, marker isolation,
two figures, themes and narrow screens. Set `PLAYWRIGHT_MODULE`, `CHROME_PATH`
and `PREVIEW_URL` if needed. Build static assets with:

```sh
pnpm --dir packages/diagram exec vite build --config ../../examples/er-tables/vite.config.ts
```

No Liam source is copied. The primitives are native implementations using Liam
as a visual and behavioral reference. Earlier experiments remain preserved in
Webharvest's comparison directories on ports 34464–34467.
