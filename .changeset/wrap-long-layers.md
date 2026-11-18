---
"@likec4/layouts": patch
"@deep-stack/likec4": patch
---

An element view whose ranks are long now opens larger: when splitting a long rank into a few shorter lines makes the diagram fit its frame at least 15% larger, the nodes wrap row by row in Graphviz's order and the edges are routed again. Views with groups, tables, classes or rank constraints keep Graphviz's layout.
