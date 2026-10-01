import type { AnyCircuitElement } from "circuit-json"

type SourceComponentId = string
type SourcePortId = string
type SourceTraceId = string
type SchematicComponentId = string
type SchematicPortId = string
type SchematicTraceId = string
type CircuitElementRecord = Record<string, unknown> & { type: string }
type SourceComponent = CircuitElementRecord & {
  name: string
  source_component_id: SourceComponentId
}
type SourcePort = CircuitElementRecord & {
  source_component_id?: SourceComponentId
  source_port_id: SourcePortId
}
type SourceTrace = CircuitElementRecord & {
  connected_source_net_ids: string[]
  connected_source_port_ids: SourcePortId[]
  source_trace_id: SourceTraceId
}
type SchematicComponent = CircuitElementRecord & {
  schematic_component_id: SchematicComponentId
  source_component_id?: SourceComponentId
}
type SchematicPort = CircuitElementRecord & {
  schematic_port_id: SchematicPortId
  source_port_id: SourcePortId
}
type SchematicTraceEdge = {
  from_schematic_port_id?: SchematicPortId
  to_schematic_port_id?: SchematicPortId
  [property: string]: unknown
}
type SchematicTrace = CircuitElementRecord & {
  edges: SchematicTraceEdge[]
  schematic_trace_id: SchematicTraceId
  source_trace_id?: SourceTraceId
}
type SchematicNetLabel = CircuitElementRecord & {
  schematic_trace_id?: SchematicTraceId
}
type SchematicGroup = CircuitElementRecord & {
  schematic_component_ids: SchematicComponentId[]
}

export function filterReferenceSchematic(params: {
  circuitJson: AnyCircuitElement[]
  removedComponentNames: ReadonlySet<string>
}): AnyCircuitElement[] {
  if (params.removedComponentNames.size === 0) return structuredClone(params.circuitJson)

  const removedSourceComponentIds = new Set<SourceComponentId>(
    params.circuitJson.flatMap((element) => {
      if (element.type !== "source_component") return []
      const component = element as unknown as SourceComponent
      return params.removedComponentNames.has(component.name) ? [component.source_component_id] : []
    }),
  )
  const removedSourcePortIds = new Set<SourcePortId>(
    params.circuitJson.flatMap((element) => {
      if (element.type !== "source_port") return []
      const port = element as unknown as SourcePort
      return port.source_component_id !== undefined &&
        removedSourceComponentIds.has(port.source_component_id)
        ? [port.source_port_id]
        : []
    }),
  )
  const removedSchematicComponentIds = new Set<SchematicComponentId>(
    params.circuitJson.flatMap((element) => {
      if (element.type !== "schematic_component") return []
      const component = element as unknown as SchematicComponent
      return component.source_component_id !== undefined &&
        removedSourceComponentIds.has(component.source_component_id)
        ? [component.schematic_component_id]
        : []
    }),
  )
  const removedSchematicPortIds = new Set<SchematicPortId>(
    params.circuitJson.flatMap((element) => {
      if (element.type !== "schematic_port") return []
      const port = element as unknown as SchematicPort
      return removedSourcePortIds.has(port.source_port_id) ? [port.schematic_port_id] : []
    }),
  )

  const updatedSourceTraces = new Map<SourceTraceId, AnyCircuitElement>()
  const removedSourceTraceIds = new Set<SourceTraceId>()
  for (const element of params.circuitJson) {
    if (element.type !== "source_trace") continue
    const sourceTrace = element as unknown as SourceTrace
    const connectedSourcePortIds = sourceTrace.connected_source_port_ids.filter(
      (sourcePortId) => !removedSourcePortIds.has(sourcePortId),
    )
    if (connectedSourcePortIds.length + sourceTrace.connected_source_net_ids.length === 0) {
      removedSourceTraceIds.add(sourceTrace.source_trace_id)
      continue
    }
    updatedSourceTraces.set(sourceTrace.source_trace_id, {
      ...sourceTrace,
      connected_source_port_ids: connectedSourcePortIds,
    } as AnyCircuitElement)
  }

  const updatedSchematicTraces = new Map<SchematicTraceId, AnyCircuitElement>()
  const removedSchematicTraceIds = new Set<SchematicTraceId>()
  for (const element of params.circuitJson) {
    if (element.type !== "schematic_trace") continue
    const schematicTrace = element as unknown as SchematicTrace
    if (
      schematicTrace.source_trace_id !== undefined &&
      removedSourceTraceIds.has(schematicTrace.source_trace_id)
    ) {
      removedSchematicTraceIds.add(schematicTrace.schematic_trace_id)
      continue
    }
    const edges = schematicTrace.edges.filter(
      (edge) =>
        !removedSchematicPortIds.has(edge.from_schematic_port_id ?? "") &&
        !removedSchematicPortIds.has(edge.to_schematic_port_id ?? ""),
    )
    if (edges.length === 0) {
      removedSchematicTraceIds.add(schematicTrace.schematic_trace_id)
      continue
    }
    updatedSchematicTraces.set(schematicTrace.schematic_trace_id, {
      ...schematicTrace,
      edges,
    } as AnyCircuitElement)
  }

  return params.circuitJson.flatMap((element) => {
    if (
      (element.type === "source_component" &&
        removedSourceComponentIds.has(
          (element as unknown as SourceComponent).source_component_id,
        )) ||
      (element.type === "source_port" &&
        removedSourcePortIds.has((element as unknown as SourcePort).source_port_id)) ||
      (element.type === "schematic_component" &&
        removedSchematicComponentIds.has(
          (element as unknown as SchematicComponent).schematic_component_id,
        )) ||
      (element.type === "schematic_port" &&
        removedSchematicPortIds.has((element as unknown as SchematicPort).schematic_port_id))
    ) {
      return []
    }

    if (element.type === "source_trace") {
      const sourceTrace = updatedSourceTraces.get(
        (element as unknown as SourceTrace).source_trace_id,
      )
      return sourceTrace ? [sourceTrace] : []
    }
    if (element.type === "schematic_trace") {
      const schematicTrace = updatedSchematicTraces.get(
        (element as unknown as SchematicTrace).schematic_trace_id,
      )
      return schematicTrace ? [schematicTrace] : []
    }
    if (
      element.type === "schematic_net_label" &&
      (element as unknown as SchematicNetLabel).schematic_trace_id !== undefined &&
      removedSchematicTraceIds.has(
        (element as unknown as SchematicNetLabel).schematic_trace_id ?? "",
      )
    ) {
      return []
    }
    if (element.type === "schematic_group") {
      const group = element as unknown as SchematicGroup
      return [
        {
          ...group,
          schematic_component_ids: group.schematic_component_ids.filter(
            (schematicComponentId) => !removedSchematicComponentIds.has(schematicComponentId),
          ),
        } as AnyCircuitElement,
      ]
    }

    const record = element as unknown as CircuitElementRecord
    if (
      typeof record.schematic_component_id === "string" &&
      removedSchematicComponentIds.has(record.schematic_component_id)
    ) {
      return []
    }
    return [element]
  })
}
