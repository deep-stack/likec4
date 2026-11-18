import {
  type AnyAux,
  type aux,
  type ComputedView,
  type DiagramView,
  type LayoutedDynamicView,
  isDeploymentView,
  isDynamicView,
  isElementView,
  LikeC4Styles,
} from '@likec4/core'
import type { ComputedProjectsView, LayoutedProjectsView } from '@likec4/core/compute-view'
import { nonexhaustive } from '@likec4/core/utils'
import { loggable, rootLogger as mainLogger, wrapError } from '@likec4/log'
import { randomString } from 'remeda'
import { type GraphBaseModel, type NodeModel, attribute as _, fromDot, toDot } from 'ts-graphviz'
import { calcSequenceLayout } from '../sequence'
import type { AILayoutHints } from './ai/types'
import { AiLayoutViewPrinter } from './AiLayoutPrinter'
import { DeploymentViewPrinter } from './DeploymentViewPrinter'
import { GraphClusterSpace } from './DotPrinter'
import { DynamicViewPrinter } from './DynamicViewPrinter'
import { ElementViewPrinter } from './ElementViewPrinter'
import { parseGraphvizJson, parseGraphvizJsonOfProjectsView } from './GraphvizParser'
import { layoutQuality } from './layout-quality'
import { packGroups } from './pack-groups'
import { ProjectsViewPrinter } from './ProjectsViewPrinter'
import type { DotSource } from './types'
import type { GraphvizJson } from './types-dot'
import { pxToPoints } from './utils'
import { GraphvizWasmAdapter } from './wasm/GraphvizWasmAdapter'
import { wrapLayers } from './wrap-layers'

/**
 * The Graphviz engine to lay out with: `dot` places the nodes and routes the edges; `nop` keeps the nodes where their
 * `pos` puts them and routes the edges only.
 */
export type LayoutEngine = 'dot' | 'nop'

export interface GraphvizPort extends Disposable {
  get name(): string
  get concurrency(): number
  unflatten(dot: DotSource): Promise<DotSource>
  acyclic(dot: DotSource): Promise<DotSource>
  layoutJson(dot: DotSource, engine?: LayoutEngine): Promise<string>
  svg(dot: DotSource): Promise<string>
  dispose(): void
}

const getPrinter = <A extends AnyAux>({ view, styles }: LayoutTaskParams<A>) => {
  switch (true) {
    case isDynamicView(view):
      return new DynamicViewPrinter(view, styles)
    case isDeploymentView(view):
      return new DeploymentViewPrinter(view, styles)
    case isElementView(view):
      return new ElementViewPrinter(view, styles)
    default:
      nonexhaustive(view)
  }
}

export type LayoutTaskParams<A extends aux.Any = aux.Any> = {
  view: ComputedView<A>
  styles: LikeC4Styles
}

export type LayoutResult<A extends aux.Any = aux.Any> = {
  dot: DotSource
  diagram: DiagramView<A>
}

const rootLogger = mainLogger.getChild('layouter')

function normalizeDot(dot: DotSource): DotSource {
  return dot
    .split('\n')
    .filter((l) => !(l.includes('margin') && l.includes(`${GraphClusterSpace}`))) // see DotPrinter.ts#L175
    .join('\n') as DotSource
}

/** A view with more edges than this tries only its best rearrangement: each try routes every edge again. */
const MANY_EDGES = 40

/** A node by its DOT name, in the graph or in any of its subgraphs, such as a group's cluster. */
function findNode(graph: GraphBaseModel, name: string): NodeModel | undefined {
  return graph.getNode(name) ?? graph.subgraphs.map(subgraph => findNode(subgraph, name)).find(Boolean)
}

/** A node's box in Graphviz JSON coordinates (points, y down): its edges, from its centre and size in inches. */
function nodeBox(object: GraphvizJson.GvNodeObject) {
  const [x, y] = object.pos.split(',').map(Number) as [number, number]
  const halfWidth = (parseFloat(object.width) * 72) / 2
  const halfHeight = (parseFloat(object.height) * 72) / 2
  return { left: x - halfWidth, top: y - halfHeight, right: x + halfWidth, bottom: y + halfHeight }
}

/**
 * Graphviz's nop engine routes edges between nodes it keeps in place, but draws no box for a group. Gives each group
 * of the routed layout the box it had around its members, moved with them, and moves its title along. Returns false
 * when a group or member is missing.
 */
function boxGroups(original: GraphvizJson, routed: GraphvizJson, view: ComputedView): boolean {
  const find = (json: GraphvizJson, id: string) => (json.objects ?? []).find(o => o.likec4_id === id)
  for (const group of view.nodes.filter(node => node.children.length > 0)) {
    const before = find(original, group.id)
    const after = find(routed, group.id)
    if (!before || !after || !('bb' in before) || 'pos' in after) {
      return false
    }
    const members = (json: GraphvizJson) =>
      group.children.map(id => find(json, id)).map(o => (o && 'pos' in o ? nodeBox(o) : null))
    const was = members(original)
    const now = members(routed)
    if (was.some(box => !box) || now.some(box => !box)) {
      return false
    }
    const extent = (boxes: Array<ReturnType<typeof nodeBox> | null>) => ({
      left: Math.min(...boxes.map(b => b!.left)),
      top: Math.min(...boxes.map(b => b!.top)),
      right: Math.max(...boxes.map(b => b!.right)),
      bottom: Math.max(...boxes.map(b => b!.bottom)),
    })
    const [llx, lly, urx, ury] = before.bb.split(',').map(Number) as [number, number, number, number]
    const old = extent(was)
    const moved = extent(now)
    const dx = moved.left - old.left
    const dy = moved.top - old.top
    after.bb = [llx + dx, lly + dy, urx + dx, ury + dy].join(',')
    if (before._ldraw_) {
      after._ldraw_ = before._ldraw_.map(op => (op.op === 'T' ? { ...op, pt: [op.pt[0] + dx, op.pt[1] + dy] } : op))
    }
  }
  return true
}

export class GraphvizLayouter implements Disposable {
  private graphviz: GraphvizPort

  constructor(graphviz?: GraphvizPort) {
    this.graphviz = graphviz ?? new GraphvizWasmAdapter()
    rootLogger.trace`created with port ${this.graphviz.name}`
  }

  dispose(): void {
    this.graphviz.dispose()
  }

  [Symbol.dispose]() {
    this.dispose()
  }

  get graphvizPort(): GraphvizPort {
    return this.graphviz
  }

  changePort(graphviz: GraphvizPort) {
    this.graphviz.dispose()
    this.graphviz = graphviz
    rootLogger.trace`change port to ${this.graphviz.name}`
  }

  /**
   * Generates DOT source for the given view and styles.
   * If `hints` are provided, they will be used to influence the layout (e.g. by specifying node/edge order).
   * This method does not perform unflattening or any other post-processing on the DOT output, so it may be used for debugging or to generate DOT for external processing.
   */
  printToDot(params: LayoutTaskParams, hints?: AILayoutHints): DotSource {
    const printer = hints ? new AiLayoutViewPrinter(params.view, params.styles, hints) : getPrinter(params)
    return normalizeDot(printer.print())
  }

  protected newScopedLogger(operation: string) {
    return rootLogger.getChild([operation, '_', randomString(4).toLowerCase()])
  }

  async dotToJson(dot: DotSource, engine: LayoutEngine = 'dot'): Promise<GraphvizJson> {
    const logger = this.newScopedLogger('dotToJson')
    let json
    try {
      json = await this.graphviz.layoutJson(dot, engine)
    } catch (error) {
      logger.error(loggable(error))
      logger.error('Failed to convert DOT to JSON:\n' + dot)
      throw error
    }
    try {
      return JSON.parse(json) as GraphvizJson
    } catch (error) {
      logger.error(loggable(error))
      logger.error`Failed to parse JSON:\n${json}\n. Generated from DOT:\n${dot}`
      throw error
    }
  }

  async layout<A extends AnyAux>(params: LayoutTaskParams<A>): Promise<LayoutResult<A>> {
    const logger = this.newScopedLogger('layout')
    try {
      logger.trace`layouting view ${params.view.id}...`
      let dot = await this.dot(params)
      const { view } = params
      const json = await this.dotToJson(dot)
      let diagram = parseGraphvizJson(json, view)
      const rearranged = await this.rearrange(dot, json, diagram, view)
      if (rearranged) {
        dot = rearranged.dot
        diagram = parseGraphvizJson(rearranged.json, view)
      }

      if (isDynamicView(diagram)) {
        Object.assign(
          diagram,
          {
            sequenceLayout: calcSequenceLayout(diagram),
          } satisfies Partial<LayoutedDynamicView<A>>,
        )
      }

      dot = normalizeDot(dot)

      logger.trace`layouting view ${params.view.id} done`
      return { dot, diagram }
    } catch (e) {
      logger.warn(loggable(e))
      throw wrapError(e, `Error during layout: ${params.view.id}`)
    }
  }

  /**
   * Rearranges a left-to-right element view that opens too small to read, when that makes it open larger: a view of
   * groups gets its groups in columns (see {@link packGroups}), and a view without groups gets its long ranks split into
   * shorter lines (see {@link wrapLayers}). The edges are routed again for the new places, and a placement is kept only
   * when it is no more cluttered than Graphviz's layout (see {@link layoutQuality}).
   *
   * Top-to-bottom views, which read in order, keep the layout Graphviz chose, as do views with tables, classes, rank
   * constraints, groups inside groups, or edges that end at a group.
   */
  protected async rearrange(
    dot: DotSource,
    json: GraphvizJson,
    diagram: DiagramView,
    view: ComputedView,
  ): Promise<{ dot: DotSource; json: GraphvizJson } | null> {
    const groups = new Set(view.nodes.filter(node => node.children.length > 0).map(node => node.id))
    const eligible = isElementView(view)
      && (view.autoLayout.direction === 'LR' || view.autoLayout.direction === 'RL')
      && view.edges.length > 0
      && !view.ranks?.length
      && view.nodes.every(node => !node.table && !node.classifier)
      && view.edges.every(edge => !groups.has(edge.source) && !groups.has(edge.target))
    if (!eligible) {
      return null
    }
    const placements = groups.size > 0
      ? packGroups(diagram.nodes)
      : wrapLayers(diagram.nodes, view.autoLayout.direction)
    if (placements.length === 0) {
      return null
    }
    const logger = this.newScopedLogger('rearrange')
    const before = layoutQuality(diagram.nodes, diagram.edges)
    // The printer names dot as the graph's layout, which would override the engine asked for, and a rank direction,
    // which Graphviz would apply again to positions that already have it; top to bottom applies none.
    const source = dot
      .replace(/\blayout\s*=\s*"?dot"?/, 'layout="nop"')
      .replace(/\brankdir\s*=\s*"?[A-Z]{2}"?/, 'rankdir="TB"')
    const objects = json.objects ?? []
    try {
      // Each try routes every edge again; a view with many edges tries only its best placement.
      const tries = view.edges.length > MANY_EDGES ? 1 : placements.length
      for (const positions of placements.slice(0, tries)) {
        const graph = fromDot(source)
        for (const box of diagram.nodes) {
          if (groups.has(box.id)) {
            continue
          }
          const place = positions.get(box.id)
          const object = objects.find(o => o.likec4_id === box.id)
          const node = place && object && 'pos' in object ? findNode(graph, object.name) : undefined
          if (!place || !node) {
            return null
          }
          // Graphviz places by the centre, in points, with y up.
          const x = pxToPoints(place.x + box.width / 2)
          const y = -pxToPoints(place.y + box.height / 2)
          node.attributes.set(_.pos, `${x},${y}!`)
        }
        const pinned = toDot(graph) as DotSource
        const routed = await this.dotToJson(pinned, 'nop')
        if (groups.size > 0 && !boxGroups(json, routed, view)) {
          return null
        }
        const result = parseGraphvizJson(routed, view)
        const after = layoutQuality(result.nodes, result.edges)
        if (
          after.labelOverlaps <= before.labelOverlaps
          && after.labelsOverNodes <= before.labelsOverNodes
          && after.edgesOverNodes <= before.edgesOverNodes
          && after.edgeCrossings <= before.edgeCrossings
          && after.edgesThroughGroups <= before.edgesThroughGroups
        ) {
          return { dot: pinned, json: routed }
        }
        logger.debug`rearranged placement of ${view.id} is more cluttered, trying the next one`
      }
    } catch (error) {
      logger.warn(`Error while rearranging: ${view.id}`, { error })
    }
    return null
  }

  async aiLayout<A extends AnyAux>(
    { view, styles }: LayoutTaskParams<A>,
    hints: AILayoutHints,
  ): Promise<LayoutResult<A>> {
    const logger = this.newScopedLogger('ai-layout')
    try {
      logger.trace`layouting view ${view.id} using AI hints...`
      const printer = new AiLayoutViewPrinter(view, styles, hints)
      let dot = printer.print()
      const json = await this.dotToJson(dot)
      let diagram = parseGraphvizJson(json, view)
      if (isDynamicView(diagram)) {
        Object.assign(
          diagram,
          {
            sequenceLayout: calcSequenceLayout(diagram),
          } satisfies Partial<LayoutedDynamicView<A>>,
        )
      }
      dot = normalizeDot(dot)
      logger.trace`layouting view ${view.id} done`
      return { dot, diagram }
    } catch (e) {
      logger.warn(loggable(e))
      throw wrapError(e, `Error during AI layout: ${view.id}`)
    }
  }

  async svg<A extends AnyAux>(params: LayoutTaskParams<A>) {
    let dot = await this.dot(params)
    dot = normalizeDot(dot)
    const svg = await this.graphviz.svg(dot)
    return {
      svg,
      dot,
    }
  }

  async dot<A extends AnyAux>(params: LayoutTaskParams<A>): Promise<DotSource> {
    const logger = this.newScopedLogger('dot')
    logger.trace`generating dot for view ${params.view.id}`
    const printer = getPrinter(params)
    let dot = printer.print()
    if (!isElementView(params.view)) {
      return normalizeDot(dot)
    }
    try {
      logger.trace`unflattening dot`
      dot = await this.graphviz.unflatten(dot)
    } catch (error) {
      logger.warn(`Error during unflatten: ${params.view.id}`, { error })
    }
    return normalizeDot(dot)
  }

  async layoutProjectsView(view: ComputedProjectsView): Promise<LayoutedProjectsView> {
    const logger = this.newScopedLogger('layoutProjectsView')
    logger.debug`layouting projects overview...`
    const printer = new ProjectsViewPrinter(view)
    let dot = printer.print()
    try {
      dot = await this.graphviz.unflatten(dot)
    } catch (error) {
      logger.warn(`Error during unflatten of projects view`, { error })
    }
    const json = await this.dotToJson(dot)
    logger.debug`layouting ${'projects overview'}`
    return parseGraphvizJsonOfProjectsView(json, view)
  }
}
