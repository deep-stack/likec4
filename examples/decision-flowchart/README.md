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
