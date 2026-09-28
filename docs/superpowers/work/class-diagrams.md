# Class diagrams execution ledger

Branch: feature/class-diagrams. Approved design and plan are in ../specs and ../plans.

- Task 1: typed semantic records, multiplicity and identity helpers implemented; 13 initial tests passed. Serialization tests in progress.
- Latest-main generation passed. Baseline run: 304 existing files passed, 3099 tests passed; the newly created red identity test was picked up during the run and failed as expected. No existing test failed.
- Ruling: use existing workspace/source aliases despite fork package renaming — main establishes those aliases — release metadata must use actual package names.
- Ruling: model primitive/package restrictions are enforced semantically rather than encoded by duplicating the entire classifier interface — keeps serialization simple while allowing precise diagnostics.
- User authorized pushing and opening a PR on September 28. No merge authorized. Preserve untracked 0 and old decision demo build output.

## Implementation progress

- Core model types, identity/multiplicity helpers, semantic checks and immutable Builder extension committed in ef20dafe5; 30 focused tests passed at that checkpoint.
- Structured UML DSL parsing and DSL round trips implemented. Latest authoring run: 5 tests passed across 2 files, including per-view filtering.
- Shared classifier text/geometry now feeds Graphviz and native canvas compartments. Association labels have reserved layout bounds; layout regression passed after observing the missing-label failure.
- Advanced records expand into typed view-only artifacts (junctions, relationship anchors, annotations and generalization-set labels). N-ary computation regression passed after observing no junction/legs before implementation.
- Editor member symbols, semantic highlighting and view filtering are integrated; final compile/regression checks still pending.
- Ruling: use structured classifier/uml/umlModel blocks and validate properties by context — keeps the grammar maintainable without discarding typed semantic records — cost if wrong: authoring syntax migration before release.
- Ruling: choose class rendering from classifier metadata rather than adding a second shape selector — prevents contradictory classifier and shape settings — cost if wrong: add a cosmetic shape alias later.
- Ruling: external formats without a tested UML writer reject class exports explicitly — prevents silent loss of semantics, consistent with existing ER exports — cost: users must use native viewer/image/DSL exports until those writers exist.
- Remaining gates: advanced canvas behavior and member attachments, cross-file diagnostics/editor references, manual-layout behavior, full regression suite, example/browser verification and final independent review. No completion claim yet.

## Publication checkpoint

- Native class rendering, rounded cards, app typography, smooth attachment joins and individual dragging are implemented. Browser regression checks passed for dragging, attached edges, collapse, filters, details, packages and themes.
- Basic Mermaid and PlantUML class exports are available. Advanced unsupported semantics and D2/DrawIO class exports report capability errors.
- Remaining review findings: reject duplicate sibling classifier/UML blocks; expand member rename to association ends and view filters; allow standard inspection of generated UML relationships.
- Remaining presentation work: crowded relationship labels in dense views. TextMate keyword coverage also needs follow-up.
- Publication is a review checkpoint, not a claim of complete UML conformance.
