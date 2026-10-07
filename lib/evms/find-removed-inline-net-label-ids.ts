import type { AnyCircuitElement } from "circuit-json"
import type { SchematicTraceEdge } from "./prune-unanchored-schematic-trace-edges"

type SchematicTextId = string
type SourceTraceId = string
type SourceTraceSheetKey = string
type SchematicPoint = { x: number; y: number }
type InlineNetLabel = AnyCircuitElement & {
  position: SchematicPoint
  schematic_sheet_id?: string
  schematic_text_id: SchematicTextId
  source_trace_id: SourceTraceId
}
type SchematicTrace = AnyCircuitElement & {
  edges: SchematicTraceEdge[]
  schematic_sheet_id?: string
  source_trace_id: SourceTraceId
}

export function findRemovedInlineNetLabelIds(params: {
  activeEdges: ReadonlySet<SchematicTraceEdge>
  circuitJson: AnyCircuitElement[]
  removedSourceTraceIds: ReadonlySet<SourceTraceId>
}): Set<SchematicTextId> {
  const edgesBySourceTraceAndSheet = new Map<SourceTraceSheetKey, SchematicTraceEdge[]>()
  for (const element of params.circuitJson) {
    if (!isSchematicTraceWithSource(element)) continue
    const key = getSourceTraceSheetKey(element)
    const edges = edgesBySourceTraceAndSheet.get(key) ?? []
    edges.push(...element.edges)
    edgesBySourceTraceAndSheet.set(key, edges)
  }

  const removedSchematicTextIds = new Set<SchematicTextId>()
  for (const element of params.circuitJson) {
    if (!isInlineNetLabel(element)) continue
    if (params.removedSourceTraceIds.has(element.source_trace_id)) {
      removedSchematicTextIds.add(element.schematic_text_id)
      continue
    }
    const nearestEdge = findNearestEdge({
      activeEdges: params.activeEdges,
      edges: edgesBySourceTraceAndSheet.get(getSourceTraceSheetKey(element)) ?? [],
      point: element.position,
    })
    if (nearestEdge && !params.activeEdges.has(nearestEdge)) {
      removedSchematicTextIds.add(element.schematic_text_id)
    }
  }
  return removedSchematicTextIds
}

function findNearestEdge(params: {
  activeEdges: ReadonlySet<SchematicTraceEdge>
  edges: SchematicTraceEdge[]
  point: SchematicPoint
}): SchematicTraceEdge | undefined {
  let nearestEdge: SchematicTraceEdge | undefined
  let nearestDistance = Number.POSITIVE_INFINITY
  for (const edge of params.edges) {
    const distance = getDistanceToSegment({ edge, point: params.point })
    if (
      distance < nearestDistance ||
      (distance === nearestDistance &&
        params.activeEdges.has(edge) &&
        nearestEdge !== undefined &&
        !params.activeEdges.has(nearestEdge))
    ) {
      nearestEdge = edge
      nearestDistance = distance
    }
  }
  return nearestEdge
}

function getDistanceToSegment(params: { edge: SchematicTraceEdge; point: SchematicPoint }): number {
  const deltaX = params.edge.to.x - params.edge.from.x
  const deltaY = params.edge.to.y - params.edge.from.y
  const squaredLength = deltaX * deltaX + deltaY * deltaY
  if (squaredLength === 0) {
    return Math.hypot(params.point.x - params.edge.from.x, params.point.y - params.edge.from.y)
  }
  const projection = Math.max(
    0,
    Math.min(
      1,
      ((params.point.x - params.edge.from.x) * deltaX +
        (params.point.y - params.edge.from.y) * deltaY) /
        squaredLength,
    ),
  )
  return Math.hypot(
    params.point.x - (params.edge.from.x + projection * deltaX),
    params.point.y - (params.edge.from.y + projection * deltaY),
  )
}

function getSourceTraceSheetKey(element: {
  schematic_sheet_id?: string
  source_trace_id: SourceTraceId
}): SourceTraceSheetKey {
  return `${element.source_trace_id}:${element.schematic_sheet_id ?? ""}`
}

function isInlineNetLabel(element: AnyCircuitElement): element is InlineNetLabel {
  return (
    element.type === "schematic_text" &&
    typeof element.schematic_text_id === "string" &&
    typeof element.source_trace_id === "string" &&
    typeof element.position === "object" &&
    element.position !== null &&
    "x" in element.position &&
    "y" in element.position &&
    typeof element.position.x === "number" &&
    typeof element.position.y === "number"
  )
}

function isSchematicTraceWithSource(element: AnyCircuitElement): element is SchematicTrace {
  return (
    element.type === "schematic_trace" &&
    typeof element.source_trace_id === "string" &&
    Array.isArray(element.edges)
  )
}
