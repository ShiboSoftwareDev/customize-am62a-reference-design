import type { AnyCircuitElement } from "circuit-json"
import type { SchematicTraceEdge } from "./prune-unanchored-schematic-trace-edges"

type SchematicPoint = { x: number; y: number }
type SchematicPortId = string
type SchematicTextId = string
type SchematicTraceId = string
type SourceTraceId = string
type SourceTraceSheetKey = string
type FacingDirection = "up" | "down" | "left" | "right"
type SchematicPort = AnyCircuitElement & {
  center: SchematicPoint
  facing_direction: FacingDirection
  schematic_port_id: SchematicPortId
  schematic_sheet_id?: string
}
type SchematicTrace = AnyCircuitElement & {
  edges: SchematicTraceEdge[]
  junctions?: SchematicPoint[]
  schematic_sheet_id?: string
  schematic_trace_id: SchematicTraceId
  source_trace_id?: SourceTraceId
}
type InlineNetLabel = AnyCircuitElement & {
  position: SchematicPoint
  schematic_sheet_id?: string
  schematic_text_id: SchematicTextId
  source_trace_id: SourceTraceId
}

export function restoreSchematicInlineNetLabelConnections(params: {
  circuitJson: AnyCircuitElement[]
  removedSchematicPortIds: ReadonlySet<SchematicPortId>
  removedSchematicTraceIds: ReadonlySet<SchematicTraceId>
  updatedSchematicTraces: ReadonlyMap<SchematicTraceId, SchematicTrace>
}): {
  removedSchematicTraceIds: Set<SchematicTraceId>
  restoredInlineNetLabelIds: Set<SchematicTextId>
  updatedSchematicTraces: Map<SchematicTraceId, SchematicTrace>
} {
  const updatedSchematicTraces = new Map(params.updatedSchematicTraces)
  const removedSchematicTraceIds = new Set(params.removedSchematicTraceIds)
  const activeSchematicPortIds = getActiveSchematicPortIds(updatedSchematicTraces)
  const schematicPortsById = new Map<SchematicPortId, SchematicPort>()
  const inlineNetLabelsBySourceTraceAndSheet = new Map<SourceTraceSheetKey, InlineNetLabel[]>()

  for (const element of params.circuitJson) {
    if (isSchematicPort(element)) {
      schematicPortsById.set(element.schematic_port_id, element)
    }
    if (isInlineNetLabel(element)) {
      const key = getSourceTraceSheetKey(element)
      const inlineNetLabels = inlineNetLabelsBySourceTraceAndSheet.get(key) ?? []
      inlineNetLabels.push(element)
      inlineNetLabelsBySourceTraceAndSheet.set(key, inlineNetLabels)
    }
  }

  const restoredSchematicPortIds = new Set<SchematicPortId>()
  const restoredInlineNetLabelIds = new Set<SchematicTextId>()
  for (const element of params.circuitJson) {
    if (!isSchematicTraceWithSource(element)) continue
    for (const edge of element.edges) {
      for (const schematicPortId of getEdgeSchematicPortIds(edge)) {
        if (
          params.removedSchematicPortIds.has(schematicPortId) ||
          activeSchematicPortIds.has(schematicPortId) ||
          restoredSchematicPortIds.has(schematicPortId)
        ) {
          continue
        }
        const schematicPort = schematicPortsById.get(schematicPortId)
        if (!schematicPort) continue
        const inlineNetLabel = findNearestInlineNetLabel({
          inlineNetLabels:
            inlineNetLabelsBySourceTraceAndSheet.get(
              getSourceTraceSheetKey({
                schematic_sheet_id: schematicPort.schematic_sheet_id,
                source_trace_id: element.source_trace_id,
              }),
            ) ?? [],
          schematicPort,
        })
        if (!inlineNetLabel) continue

        const repairedTrace = updatedSchematicTraces.get(element.schematic_trace_id) ?? {
          ...element,
          edges: [],
          junctions: [],
        }
        updatedSchematicTraces.set(element.schematic_trace_id, {
          ...repairedTrace,
          edges: [
            ...repairedTrace.edges,
            {
              from: schematicPort.center,
              from_schematic_port_id: schematicPort.schematic_port_id,
              to: getInlineNetLabelConnectionPoint({ inlineNetLabel, schematicPort }),
            },
          ],
        })
        removedSchematicTraceIds.delete(element.schematic_trace_id)
        restoredInlineNetLabelIds.add(inlineNetLabel.schematic_text_id)
        restoredSchematicPortIds.add(schematicPortId)
      }
    }
  }

  return {
    removedSchematicTraceIds,
    restoredInlineNetLabelIds,
    updatedSchematicTraces,
  }
}

function getActiveSchematicPortIds(
  updatedSchematicTraces: ReadonlyMap<SchematicTraceId, SchematicTrace>,
): Set<SchematicPortId> {
  return new Set(
    [...updatedSchematicTraces.values()].flatMap(({ edges }) =>
      edges.flatMap(getEdgeSchematicPortIds),
    ),
  )
}

function getEdgeSchematicPortIds(edge: SchematicTraceEdge): SchematicPortId[] {
  return [edge.from_schematic_port_id, edge.to_schematic_port_id].filter(
    (schematicPortId): schematicPortId is SchematicPortId => schematicPortId !== undefined,
  )
}

function findNearestInlineNetLabel(params: {
  inlineNetLabels: InlineNetLabel[]
  schematicPort: SchematicPort
}): InlineNetLabel | undefined {
  const labelsInFacingDirection = params.inlineNetLabels.filter(
    (inlineNetLabel) =>
      getDistanceInFacingDirection({ inlineNetLabel, schematicPort: params.schematicPort }) >= 0,
  )
  const candidates =
    labelsInFacingDirection.length > 0 ? labelsInFacingDirection : params.inlineNetLabels
  return candidates.reduce<InlineNetLabel | undefined>((nearestLabel, inlineNetLabel) => {
    if (!nearestLabel) return inlineNetLabel
    return getSquaredDistance(inlineNetLabel.position, params.schematicPort.center) <
      getSquaredDistance(nearestLabel.position, params.schematicPort.center)
      ? inlineNetLabel
      : nearestLabel
  }, undefined)
}

function getDistanceInFacingDirection(params: {
  inlineNetLabel: InlineNetLabel
  schematicPort: SchematicPort
}): number {
  const deltaX = params.inlineNetLabel.position.x - params.schematicPort.center.x
  const deltaY = params.inlineNetLabel.position.y - params.schematicPort.center.y
  switch (params.schematicPort.facing_direction) {
    case "right":
      return deltaX
    case "left":
      return -deltaX
    case "up":
      return deltaY
    case "down":
      return -deltaY
  }
}

function getInlineNetLabelConnectionPoint(params: {
  inlineNetLabel: InlineNetLabel
  schematicPort: SchematicPort
}): SchematicPoint {
  if (
    params.schematicPort.facing_direction === "left" ||
    params.schematicPort.facing_direction === "right"
  ) {
    return {
      x: params.inlineNetLabel.position.x,
      y: params.schematicPort.center.y,
    }
  }
  return {
    x: params.schematicPort.center.x,
    y: params.inlineNetLabel.position.y,
  }
}

function getSquaredDistance(pointA: SchematicPoint, pointB: SchematicPoint): number {
  return (pointA.x - pointB.x) ** 2 + (pointA.y - pointB.y) ** 2
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

function isSchematicPort(element: AnyCircuitElement): element is SchematicPort {
  return (
    element.type === "schematic_port" &&
    typeof element.schematic_port_id === "string" &&
    typeof element.center === "object" &&
    element.center !== null &&
    typeof element.facing_direction === "string"
  )
}

function isSchematicTraceWithSource(element: AnyCircuitElement): element is SchematicTrace & {
  source_trace_id: SourceTraceId
} {
  return (
    element.type === "schematic_trace" &&
    typeof element.schematic_trace_id === "string" &&
    typeof element.source_trace_id === "string" &&
    Array.isArray(element.edges)
  )
}
