import { pointToSegmentDistance } from "@tscircuit/math-utils"
import type { AnyCircuitElement } from "circuit-json"
import type { SchematicTraceEdge } from "./prune-unanchored-schematic-trace-edges"

type SchematicNetLabelId = string
type SchematicPoint = { x: number; y: number }
type SchematicTraceId = string
type SourceNetId = string
type SourceTraceId = string
type SchematicNetLabel = AnyCircuitElement & {
  anchor_position?: SchematicPoint
  center: SchematicPoint
  schematic_net_label_id: SchematicNetLabelId
  schematic_sheet_id?: string
  schematic_trace_id?: SchematicTraceId
  source_net_id?: SourceNetId
}
type SchematicTrace = AnyCircuitElement & {
  edges: SchematicTraceEdge[]
  schematic_sheet_id?: string
  schematic_trace_id: SchematicTraceId
  source_trace_id?: SourceTraceId
}
type SourceTrace = AnyCircuitElement & {
  connected_source_net_ids: SourceNetId[]
  source_trace_id: SourceTraceId
}

const SCHEMATIC_CONNECTION_TOLERANCE = 0.000001

export function restoreSchematicNetLabelConnections(params: {
  circuitJson: AnyCircuitElement[]
  removedSchematicNetLabelIds: ReadonlySet<SchematicNetLabelId>
  updatedSchematicTraces: ReadonlyMap<SchematicTraceId, SchematicTrace>
}): {
  removedSchematicNetLabelIds: Set<SchematicNetLabelId>
  updatedSchematicNetLabels: Map<SchematicNetLabelId, SchematicNetLabel>
} {
  const removedSchematicNetLabelIds = new Set(params.removedSchematicNetLabelIds)
  const updatedSchematicNetLabels = new Map<SchematicNetLabelId, SchematicNetLabel>()
  const sourceNetIdsBySourceTraceId = new Map<SourceTraceId, ReadonlySet<SourceNetId>>()
  for (const element of params.circuitJson) {
    if (!isSourceTrace(element)) continue
    sourceNetIdsBySourceTraceId.set(
      element.source_trace_id,
      new Set(element.connected_source_net_ids),
    )
  }

  for (const element of params.circuitJson) {
    if (
      !isSchematicNetLabel(element) ||
      !removedSchematicNetLabelIds.has(element.schematic_net_label_id)
    ) {
      continue
    }
    const anchor = element.anchor_position ?? element.center
    const activeTrace = [...params.updatedSchematicTraces.values()].find(
      (schematicTrace) =>
        schematicTrace.schematic_sheet_id === element.schematic_sheet_id &&
        schematicTrace.source_trace_id !== undefined &&
        (element.source_net_id === undefined ||
          sourceNetIdsBySourceTraceId
            .get(schematicTrace.source_trace_id)
            ?.has(element.source_net_id)) &&
        schematicTrace.edges.some(
          (edge) =>
            pointToSegmentDistance(anchor, edge.from, edge.to) <= SCHEMATIC_CONNECTION_TOLERANCE,
        ),
    )
    if (!activeTrace) continue

    updatedSchematicNetLabels.set(element.schematic_net_label_id, {
      ...element,
      schematic_trace_id: activeTrace.schematic_trace_id,
    })
    removedSchematicNetLabelIds.delete(element.schematic_net_label_id)
  }

  return { removedSchematicNetLabelIds, updatedSchematicNetLabels }
}

function isSchematicNetLabel(element: AnyCircuitElement): element is SchematicNetLabel {
  return (
    element.type === "schematic_net_label" &&
    typeof element.schematic_net_label_id === "string" &&
    typeof element.center === "object" &&
    element.center !== null
  )
}

function isSourceTrace(element: AnyCircuitElement): element is SourceTrace {
  return (
    element.type === "source_trace" &&
    typeof element.source_trace_id === "string" &&
    Array.isArray(element.connected_source_net_ids)
  )
}
