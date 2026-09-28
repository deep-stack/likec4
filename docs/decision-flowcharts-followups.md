# Decision flowcharts and ER: review follow-ups

The decision-chart PR addresses direct branch self-loops, nonblocking authoring warnings, and explicit export limitations. The items below remain deferred; they are not claims of supported functionality.

## ER integration

1. **Preserve relationship presentation.** Route ER edges through shared relationship styling and label handling. Currently table edges can lose authored labels, colors and dashed/solid styles in layout/rendering. Acceptance: an ER relationship with a title, red color and dashed line retains all three on the canvas and after saved-layout reuse.
2. **Share element interactions.** TableNode bypasses the ordinary element action/detail wrapper. Refactor shared UI so tables receive applicable details, navigation, toolbar, tags, notes and drift controls. Honor read-only behavior for dragging. Acceptance: architecture and table nodes use the same supported interaction contract, without duplicated control implementations.
3. **Make field semantics stable across views.** FK badges are currently derived from visible edges. Derive schema/foreign-key identity from model data so filtering a referenced table does not change a field's meaning. Acceptance: filtering the parent keeps the child's FK badge.
4. **Consolidate table presentation.** Move hardcoded colors and special CSS/drag behavior into the established theme/recipe and interaction patterns. Verify both themes and read-only use.
5. **ER exports remain explicitly unsupported outside DSL.** Add format-specific mappings with tests in a later PR; do not silently flatten tables or field relationships.

## Decision feature scope

- **Dynamic views and playback:** branch metadata is currently an element-view feature. Dynamic-view computation does not preserve it consistently. Add an explicit dynamic-view contract before promising branch-aware playback. Branch-choice interaction, condition evaluation and DMN are outside this version.
- **Authoring checks:** current warnings use model relationships within one project and explicit branch opt-in. View-only styling, imported-project flows, and effective extended model properties need a separate validation design. Disconnected diamonds without branch opt-in are not diagnosed. There is no proof of condition exclusivity, completeness or eventual termination.
- **Export coverage:** D2 pills and PlantUML decision shapes fail explicitly. Add faithful mappings rather than dropping the notation. Keep Mermaid/DrawIO and DSL coverage as formats evolve.
- **Layout controls:** Graphviz selects attachment sides. Fixed Yes/No sides and specialized flowchart routing are not guaranteed.

## Example and downstream documentation

- The supplied scenario uses pills for actions to match the reference image. Prefer rectangles for process steps and pills for start/end when preparing a conventional flowchart example.
- The local Webharvest report simplifies authentication: session validation can still encounter CSRF rejection before reaching the operator principal. A source-faithful follow-up should show that failure path and label any remaining simplifications.
- The Webharvest preview uses a locally built feature branch. Normal ngin8r dependency adoption is separate release/integration work; its ER sections still use Mermaid. A local demonstration does not establish released support.

## Follow-up acceptance

Keep changes in the existing typed model, parser, computation, layout and shared canvas layers. Cover each behavior at the layer that owns it, plus a representative end-to-end model/layout case. Avoid per-example rendering exceptions or a second diagram engine.
