# Native class diagrams

From the repository root:

```sh
pnpm generate
node --conditions=sources --import tsx examples/class-diagrams/generate.ts
pnpm --dir styled-system/styles exec pandacss cssgen --outfile ../../examples/class-diagrams/panda.css
pnpm --dir packages/diagram exec vite --config ../../examples/class-diagrams/vite.config.ts --port 34470
```

The overview exercises abstract classes, interfaces, enumerations, data and primitive types, overloads, generic templates and bindings, inheritance, realization, dependency, composition, qualified and recursive associations, an n-ary association, an association class, generalization sets and a member constraint.

`publicApi` hides private members and compartments in that view. `packages` shows containment. Class compartments have keyboard-accessible collapse buttons; collapse is local display state. Pan, zoom, selection, details, links and image export use the native LikeC4 canvas.

A classifier is declared with `classifier { ... }` on an ordinary element. Stable member IDs precede optional display names. `type 'Text'` declares an external type; `type ref 'domain.address'` references a classifier. Binary relationships carry `uml { id 'stableId' kind association ... }`. Advanced relationships and annotations live in `umlModel { ... }`.

External Mermaid, PlantUML, D2 and DrawIO writers currently reject UML diagrams rather than discard semantics. Use the native viewer, image or LikeC4 DSL export. Constraints are displayed and preserved, not executed as OCL; source code and XMI generation are outside this feature.
