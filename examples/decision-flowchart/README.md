# Native decision flowchart

`scenario.c4` recreates the supplied decision chart using LikeC4's DSL, Graphviz layout and React canvas. Question nodes use `diamond`, actions use `pill`, and `branch` labels identify each Yes/No path. For example: `impacting -> continue { branch 'No' }`.

Use Node 22.22.3 or newer and the repository's pnpm version:

```sh
pnpm generate
node --conditions=sources --import tsx examples/decision-flowchart/generate.ts
pnpm --dir styled-system/styles exec pandacss cssgen --outfile ../../examples/decision-flowchart/panda.css
pnpm --dir packages/diagram exec vite --config ../../examples/decision-flowchart/vite.config.ts --port 34470
```

Open `http://127.0.0.1:34470/`. The theme button, canvas controls, zoom, and navigation are LikeC4's existing features. The example uses a top-to-bottom layout; Graphviz chooses exact branch attachment sides.

## Decision paths and warnings

Use `branch 'Retry'` on a relationship back to the same question for a direct retry loop. Multiple answers may share a destination; paths may also rejoin or form cycles. Plain architecture self-relationships remain invalid.

Using `branch` opts a connected model component into flowchart diagnostics. The language server warns on branch sources and connected model/specification diamonds when a decision has zero or one outgoing path, a path lacks `branch`, or outgoing labels repeat after trimming whitespace. Labels are case-sensitive. Multiway decisions are allowed. Warnings do not prevent layout or rendering.

These are model-level authoring checks, not execution rules. They do not infer decisions from view-only shape overrides, validate predicates, require Yes/No labels, or require a start/end node. A component without any `branch` metadata remains an ordinary architecture model. Use explicit `branch` metadata rather than a relationship title for decision answers.

## Exports

| Format              | Decision support                                                             |
| ------------------- | ---------------------------------------------------------------------------- |
| LikeC4 viewer / DSL | Diamonds, pills, branch labels and retry loops                               |
| Mermaid             | Diamonds, stadium-shaped pills and labels                                    |
| DrawIO              | Diamonds, rounded pills and labels                                           |
| D2                  | Diamonds and labels; pill nodes produce an explicit unsupported-export error |
| PlantUML            | Diamond or pill nodes produce an explicit unsupported-export error           |

Export errors prevent silently turning decision notation into rectangles. The PlantUML exporter currently generates architecture diagrams; a dedicated flowchart/activity mapping is deferred.

For conventional process notation, use rectangles for actions and reserve pills for start/end. The supplied visual reference uses pills for actions, which this example intentionally reproduces.

See [review follow-ups](../../docs/decision-flowcharts-followups.md) for the remaining work.
