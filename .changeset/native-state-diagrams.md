---
"@deep-stack/likec4-core": patch
"@likec4/language-server": patch
"@likec4/layouts": patch
"@likec4/diagram": patch
"@deep-stack/likec4-generators": patch
"@likec4/style-preset": patch
"@deep-stack/likec4": patch
"likec4-vscode": patch
---

Add native UML state transition diagrams: `state`, `initial` and `final` shapes, and a `transition { trigger guard effect }` block that labels an edge `trigger [guard] / effect` with the guard highlighted. States may transition to themselves.

Warn about malformed state diagrams, such as an initial state with more than one way out or a final state with a way out. Mermaid and DrawIO keep the notation; D2 and PlantUML report it as unsupported.
