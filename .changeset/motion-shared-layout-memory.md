---
"@likec4/diagram": patch
"@deep-stack/likec4": patch
---

Diagrams no longer stay in memory after they are removed from the page. `motion` is updated from 12.43 to 14.6, which releases the shared layout animations of elements that have unmounted, so a page that mounts and removes many embedded diagrams keeps its memory flat.
