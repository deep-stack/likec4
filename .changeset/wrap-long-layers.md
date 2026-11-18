---
"@likec4/layouts": patch
"@deep-stack/likec4": patch
---

A left-to-right element view that opens too small to read is rearranged to open larger. Its groups are placed in columns instead of one under another, and a view without groups has its long ranks split into shorter lines, in Graphviz's order. The edges are routed again, and the new layout is kept only when it has no more overlapping edge labels and no more edges across nodes. Top-to-bottom views keep Graphviz's layout, as do views with tables, classes, rank constraints, nested groups, nodes outside groups beside groups, or edges that end at a group.
