# ER table previews for embedded readers

Full tables remain the default. After the diagram actor is initialized, a host can
opt into previews through the existing public `useDiagram()` API:

```ts
diagram.send({ type: 'table.preview', expanded: { orders: true } })
diagram.send({ type: 'table.expand', node: tableId, expanded: true })
diagram.send({ type: 'table.expand', expanded: false }) // all tables
diagram.send({ type: 'table.reveal', node: tableId, field: 'customer_id' })
```

`table.reveal` expands and highlights; the native field search also centres the
viewport on that row. Keys and displayed relationship endpoints always remain
visible. Layout is derived from the original nodes each time, preserving the
canonical model and exports. The fit control uses the display bounds.

Hosts can subscribe to `diagram.actor` and read `context.tablePreview.expanded`,
`context.viewport` and `context.viewportChangedManually`. Store them outside this
package, keyed by project/view and a compatible layout signature. Restore the
expansion after initialization, then send `interaction.restore` with `viewport`
and `manual` after node measurement. That event cancels pending automatic fits.
A `table.preview` event has no effect on diagrams without tables.

The existing actor event/subscription interface is the public integration point;
there is no second persistence API or storage policy inside the diagram package.
