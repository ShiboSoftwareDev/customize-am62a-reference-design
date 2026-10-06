import type { AnyCircuitElement } from "circuit-json"
import {
  pruneSchematicTraceEdgesAfterPortRemoval,
  type SchematicTraceEdge,
} from "./prune-unanchored-schematic-trace-edges"

type ComponentName = string
type SourceComponentId = string
type SourcePortId = string
type SourceTraceId = string
type SchematicComponentId = string
type SchematicPortId = string
type SchematicTraceId = string
type SourceComponent = AnyCircuitElement & {
  name: ComponentName
  source_component_id: SourceComponentId
}
type SourcePort = AnyCircuitElement & {
  source_component_id?: SourceComponentId
  source_port_id: SourcePortId
}
type SourceTrace = AnyCircuitElement & {
  connected_source_net_ids: string[]
  connected_source_port_ids: SourcePortId[]
  source_trace_id: SourceTraceId
}
type SchematicComponent = AnyCircuitElement & {
  schematic_component_id: SchematicComponentId
  source_component_id?: SourceComponentId
}
type SchematicPort = AnyCircuitElement & {
  schematic_port_id: SchematicPortId
  source_port_id: SourcePortId
}
type SchematicTrace = AnyCircuitElement & {
  edges: SchematicTraceEdge[]
  schematic_trace_id: SchematicTraceId
  source_trace_id?: SourceTraceId
}
type SchematicNetLabel = AnyCircuitElement & {
  anchor_position?: { x: number; y: number }
  center: { x: number; y: number }
  schematic_trace_id?: SchematicTraceId
}
type SchematicGroup = AnyCircuitElement & {
  schematic_component_ids: SchematicComponentId[]
}

export function filterReferenceSchematic(params: {
  circuitJson: AnyCircuitElement[]
  removedComponentNames: ReadonlySet<ComponentName>
}): AnyCircuitElement[] {
  if (params.removedComponentNames.size === 0) return structuredClone(params.circuitJson)

  const removedSourceComponentIds = new Set<SourceComponentId>(
    params.circuitJson.flatMap((element) =>
      isSourceComponent(element) && params.removedComponentNames.has(element.name)
        ? [element.source_component_id]
        : [],
    ),
  )
  const removedSourcePortIds = new Set<SourcePortId>(
    params.circuitJson.flatMap((element) =>
      isSourcePort(element) &&
      element.source_component_id !== undefined &&
      removedSourceComponentIds.has(element.source_component_id)
        ? [element.source_port_id]
        : [],
    ),
  )
  const removedSchematicComponentIds = new Set<SchematicComponentId>(
    params.circuitJson.flatMap((element) =>
      isSchematicComponent(element) &&
      element.source_component_id !== undefined &&
      removedSourceComponentIds.has(element.source_component_id)
        ? [element.schematic_component_id]
        : [],
    ),
  )
  const removedSchematicPortIds = new Set<SchematicPortId>(
    params.circuitJson.flatMap((element) =>
      isSchematicPort(element) && removedSourcePortIds.has(element.source_port_id)
        ? [element.schematic_port_id]
        : [],
    ),
  )

  const { removedSourceTraceIds, updatedSourceTraces } = updateSourceTraces({
    circuitJson: params.circuitJson,
    removedSourcePortIds,
  })
  const { removedSchematicTraceIds, updatedSchematicTraces } = updateSchematicTraces({
    circuitJson: params.circuitJson,
    removedSchematicPortIds,
    removedSourceTraceIds,
  })

  return params.circuitJson.flatMap((element) => {
    if (
      (isSourceComponent(element) && removedSourceComponentIds.has(element.source_component_id)) ||
      (isSourcePort(element) && removedSourcePortIds.has(element.source_port_id)) ||
      (isSchematicComponent(element) &&
        removedSchematicComponentIds.has(element.schematic_component_id)) ||
      (isSchematicPort(element) && removedSchematicPortIds.has(element.schematic_port_id))
    ) {
      return []
    }
    if (isSourceTrace(element)) {
      const sourceTrace = updatedSourceTraces.get(element.source_trace_id)
      return sourceTrace ? [sourceTrace] : []
    }
    if (isSchematicTrace(element)) {
      const schematicTrace = updatedSchematicTraces.get(element.schematic_trace_id)
      return schematicTrace ? [schematicTrace] : []
    }
    if (
      isSchematicNetLabel(element) &&
      element.schematic_trace_id !== undefined &&
      removedSchematicTraceIds.has(element.schematic_trace_id)
    ) {
      return []
    }
    if (isSchematicGroup(element)) {
      return [
        {
          ...element,
          schematic_component_ids: element.schematic_component_ids.filter(
            (componentId) => !removedSchematicComponentIds.has(componentId),
          ),
        },
      ]
    }
    if (
      "schematic_component_id" in element &&
      typeof element.schematic_component_id === "string" &&
      removedSchematicComponentIds.has(element.schematic_component_id)
    ) {
      return []
    }
    return [element]
  })
}

function updateSourceTraces(params: {
  circuitJson: AnyCircuitElement[]
  removedSourcePortIds: ReadonlySet<SourcePortId>
}): {
  removedSourceTraceIds: Set<SourceTraceId>
  updatedSourceTraces: Map<SourceTraceId, SourceTrace>
} {
  const removedSourceTraceIds = new Set<SourceTraceId>()
  const updatedSourceTraces = new Map<SourceTraceId, SourceTrace>()
  for (const element of params.circuitJson) {
    if (!isSourceTrace(element)) continue
    const connectedSourcePortIds = element.connected_source_port_ids.filter(
      (sourcePortId) => !params.removedSourcePortIds.has(sourcePortId),
    )
    if (connectedSourcePortIds.length + element.connected_source_net_ids.length === 0) {
      removedSourceTraceIds.add(element.source_trace_id)
      continue
    }
    updatedSourceTraces.set(element.source_trace_id, {
      ...element,
      connected_source_port_ids: connectedSourcePortIds,
    })
  }
  return { removedSourceTraceIds, updatedSourceTraces }
}

function updateSchematicTraces(params: {
  circuitJson: AnyCircuitElement[]
  removedSchematicPortIds: ReadonlySet<SchematicPortId>
  removedSourceTraceIds: ReadonlySet<SourceTraceId>
}): {
  removedSchematicTraceIds: Set<SchematicTraceId>
  updatedSchematicTraces: Map<SchematicTraceId, SchematicTrace>
} {
  const removedSchematicTraceIds = new Set<SchematicTraceId>()
  const updatedSchematicTraces = new Map<SchematicTraceId, SchematicTrace>()
  const schematicTraceGroups = new Map<SourceTraceId, SchematicTrace[]>()
  for (const element of params.circuitJson) {
    if (!isSchematicTrace(element)) continue
    if (element.source_trace_id === undefined) {
      updateSchematicTraceGroup({
        circuitJson: params.circuitJson,
        removedSchematicPortIds: params.removedSchematicPortIds,
        removedSchematicTraceIds,
        traces: [element],
        updatedSchematicTraces,
      })
      continue
    }
    if (params.removedSourceTraceIds.has(element.source_trace_id)) {
      removedSchematicTraceIds.add(element.schematic_trace_id)
      continue
    }
    const traces = schematicTraceGroups.get(element.source_trace_id) ?? []
    traces.push(element)
    schematicTraceGroups.set(element.source_trace_id, traces)
  }
  for (const traces of schematicTraceGroups.values()) {
    updateSchematicTraceGroup({
      circuitJson: params.circuitJson,
      removedSchematicPortIds: params.removedSchematicPortIds,
      removedSchematicTraceIds,
      traces,
      updatedSchematicTraces,
    })
  }
  return { removedSchematicTraceIds, updatedSchematicTraces }
}

function updateSchematicTraceGroup(params: {
  circuitJson: AnyCircuitElement[]
  removedSchematicPortIds: ReadonlySet<SchematicPortId>
  removedSchematicTraceIds: Set<SchematicTraceId>
  traces: SchematicTrace[]
  updatedSchematicTraces: Map<SchematicTraceId, SchematicTrace>
}): void {
  const schematicTraceIds = new Set(
    params.traces.map(({ schematic_trace_id }) => schematic_trace_id),
  )
  const edges = params.traces.flatMap(({ edges }) => edges)
  const activeEdges = new Set(
    pruneSchematicTraceEdgesAfterPortRemoval({
      anchorPoints: params.circuitJson.flatMap((candidate) =>
        isSchematicNetLabel(candidate) &&
        candidate.schematic_trace_id !== undefined &&
        schematicTraceIds.has(candidate.schematic_trace_id)
          ? [candidate.anchor_position ?? candidate.center]
          : [],
      ),
      edges,
      removedSchematicPortIds: params.removedSchematicPortIds,
    }),
  )

  for (const trace of params.traces) {
    const traceEdges = trace.edges.filter((edge) => activeEdges.has(edge))
    if (traceEdges.length === 0) {
      params.removedSchematicTraceIds.add(trace.schematic_trace_id)
      continue
    }
    params.updatedSchematicTraces.set(trace.schematic_trace_id, {
      ...trace,
      edges: traceEdges,
    })
  }
}

function isSourceComponent(element: AnyCircuitElement): element is SourceComponent {
  return (
    element.type === "source_component" &&
    typeof element.name === "string" &&
    typeof element.source_component_id === "string"
  )
}

function isSourcePort(element: AnyCircuitElement): element is SourcePort {
  return (
    element.type === "source_port" &&
    typeof element.source_port_id === "string" &&
    (element.source_component_id === undefined || typeof element.source_component_id === "string")
  )
}

function isSourceTrace(element: AnyCircuitElement): element is SourceTrace {
  return (
    element.type === "source_trace" &&
    typeof element.source_trace_id === "string" &&
    Array.isArray(element.connected_source_port_ids) &&
    element.connected_source_port_ids.every((sourcePortId) => typeof sourcePortId === "string") &&
    Array.isArray(element.connected_source_net_ids) &&
    element.connected_source_net_ids.every((sourceNetId) => typeof sourceNetId === "string")
  )
}

function isSchematicComponent(element: AnyCircuitElement): element is SchematicComponent {
  return (
    element.type === "schematic_component" &&
    typeof element.schematic_component_id === "string" &&
    (element.source_component_id === undefined || typeof element.source_component_id === "string")
  )
}

function isSchematicPort(element: AnyCircuitElement): element is SchematicPort {
  return (
    element.type === "schematic_port" &&
    typeof element.schematic_port_id === "string" &&
    typeof element.source_port_id === "string"
  )
}

function isSchematicTrace(element: AnyCircuitElement): element is SchematicTrace {
  return (
    element.type === "schematic_trace" &&
    typeof element.schematic_trace_id === "string" &&
    Array.isArray(element.edges) &&
    (element.source_trace_id === undefined || typeof element.source_trace_id === "string")
  )
}

function isSchematicNetLabel(element: AnyCircuitElement): element is SchematicNetLabel {
  return element.type === "schematic_net_label"
}

function isSchematicGroup(element: AnyCircuitElement): element is SchematicGroup {
  return (
    element.type === "schematic_group" &&
    Array.isArray(element.schematic_component_ids) &&
    element.schematic_component_ids.every(
      (schematicComponentId) => typeof schematicComponentId === "string",
    )
  )
}
