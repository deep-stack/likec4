---
"@likec4/layouts": patch
"@deep-stack/likec4": patch
---

A left-to-right element view that opens too small to read is rearranged to open larger. Its groups, and the nodes outside them, are placed in columns instead of one under another, and a view without groups has its long ranks split into shorter lines, in Graphviz's order. The edges are routed again, and the new layout is kept only when it is no more cluttered than Graphviz's: no more edge labels over each other or over nodes, edges across nodes, edges crossing each other, or edges through a group neither of their ends is in. Top-to-bottom views keep Graphviz's layout, as do views with tables, classes, rank constraints, nested groups or edges that end at a group.
