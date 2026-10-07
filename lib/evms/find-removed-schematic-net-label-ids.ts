import { distance, pointToSegmentDistance } from "@tscircuit/math-utils"
import type { AnyCircuitElement } from "circuit-json"
import type { SchematicTraceEdge } from "./prune-unanchored-schematic-trace-edges"

type SchematicNetLabelId = string
type SchematicPoint = { x: number; y: number }
type SchematicPortId = string
type SchematicTraceId = string
type SchematicNetLabel = AnyCircuitElement & {
  anchor_position?: SchematicPoint
  center: SchematicPoint
  schematic_net_label_id: SchematicNetLabelId
  schematic_sheet_id?: string
  schematic_trace_id?: SchematicTraceId
}
type SchematicPort = AnyCircuitElement & {
  center: SchematicPoint
  schematic_port_id: SchematicPortId
  schematic_sheet_id?: string
}
type SchematicTrace = AnyCircuitElement & {
  edges: SchematicTraceEdge[]
  schematic_sheet_id?: string
}

const SCHEMATIC_CONNECTION_TOLERANCE = 0.000001

export function findRemovedSchematicNetLabelIds(params: {
  activeEdges: ReadonlySet<SchematicTraceEdge>
  circuitJson: AnyCircuitElement[]
  removedSchematicPortIds: ReadonlySet<SchematicPortId>
  removedSchematicTraceIds: ReadonlySet<SchematicTraceId>
}): Set<SchematicNetLabelId> {
  const schematicPorts = params.circuitJson.filter(
    (element): element is SchematicPort => element.type === "schematic_port",
  )
  const schematicTraces = params.circuitJson.filter(
    (element): element is SchematicTrace => element.type === "schematic_trace",
  )
  const schematicNetLabels = params.circuitJson.filter(
    (element): element is SchematicNetLabel => element.type === "schematic_net_label",
  )
  const removedSchematicNetLabelIds = new Set<SchematicNetLabelId>()

  for (const element of schematicNetLabels) {
    if (element.schematic_trace_id !== undefined) {
      if (params.removedSchematicTraceIds.has(element.schematic_trace_id)) {
        removedSchematicNetLabelIds.add(element.schematic_net_label_id)
      }
      continue
    }

    const anchor = element.anchor_position ?? element.center
    let hasActiveConnection = false
    let hasRemovedConnection = false
    for (const schematicPort of schematicPorts) {
      if (
        schematicPort.schematic_sheet_id !== element.schematic_sheet_id ||
        distance(schematicPort.center, anchor) > SCHEMATIC_CONNECTION_TOLERANCE
      ) {
        continue
      }
      if (params.removedSchematicPortIds.has(schematicPort.schematic_port_id)) {
        hasRemovedConnection = true
      } else {
        hasActiveConnection = true
      }
    }
    for (const schematicTrace of schematicTraces) {
      if (schematicTrace.schematic_sheet_id !== element.schematic_sheet_id) {
        continue
      }
      for (const edge of schematicTrace.edges) {
        if (pointToSegmentDistance(anchor, edge.from, edge.to) > SCHEMATIC_CONNECTION_TOLERANCE) {
          continue
        }
        if (params.activeEdges.has(edge)) {
          hasActiveConnection = true
        } else {
          hasRemovedConnection = true
        }
      }
    }
    if (hasRemovedConnection && !hasActiveConnection) {
      removedSchematicNetLabelIds.add(element.schematic_net_label_id)
    }
  }

  return removedSchematicNetLabelIds
}
