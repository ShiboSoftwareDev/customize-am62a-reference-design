import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { gunzipSync, strFromU8 } from "fflate"
import { filterReferenceSchematic } from "../lib/evms/filter-reference-schematic"
import { getReferenceSchematicComponentName } from "../lib/evms/get-reference-schematic-component-name"
import { lmg342xBbEvmDefinition } from "../lib/generated/ti-evms/lmg342x-bb-evm.generated"

type SourceComponent = AnyCircuitElement & {
  name: string
  source_component_id: string
}
type SourcePort = AnyCircuitElement & {
  source_component_id?: string
  source_port_id: string
}
type SchematicPort = AnyCircuitElement & {
  schematic_port_id: string
  source_port_id: string
}
type SchematicTrace = AnyCircuitElement & {
  edges: Array<{
    from_schematic_port_id?: string
    to_schematic_port_id?: string
  }>
  schematic_trace_id: string
}

test("LMG342X status-indicator removal does not leave orphaned schematic leads", async () => {
  const circuitJson = await readLmg342xSchematic()
  const removedComponentNames = new Set(
    lmg342xBbEvmDefinition.components.flatMap((component) =>
      component.removableFeatureId === "status-indicators"
        ? [getReferenceSchematicComponentName(component)]
        : [],
    ),
  )
  const removedSourceComponentIds = new Set(
    circuitJson.flatMap((element) =>
      isSourceComponent(element) && removedComponentNames.has(element.name)
        ? [element.source_component_id]
        : [],
    ),
  )
  const removedSourcePortIds = new Set(
    circuitJson.flatMap((element) =>
      isSourcePort(element) &&
      element.source_component_id &&
      removedSourceComponentIds.has(element.source_component_id)
        ? [element.source_port_id]
        : [],
    ),
  )
  const removedSchematicPortIds = new Set(
    circuitJson.flatMap((element) =>
      isSchematicPort(element) && removedSourcePortIds.has(element.source_port_id)
        ? [element.schematic_port_id]
        : [],
    ),
  )
  const affectedPortLeadIds = new Set(
    circuitJson.flatMap((element) => {
      if (!isSchematicTrace(element)) return []
      const hasRemovedPort = element.edges.some(
        (edge) =>
          removedSchematicPortIds.has(edge.from_schematic_port_id ?? "") ||
          removedSchematicPortIds.has(edge.to_schematic_port_id ?? ""),
      )
      const hasRetainedPort = element.edges.some(
        (edge) =>
          (edge.from_schematic_port_id &&
            !removedSchematicPortIds.has(edge.from_schematic_port_id)) ||
          (edge.to_schematic_port_id && !removedSchematicPortIds.has(edge.to_schematic_port_id)),
      )
      return hasRemovedPort && !hasRetainedPort ? [element.schematic_trace_id] : []
    }),
  )

  expect(affectedPortLeadIds.size).toBeGreaterThan(0)

  const filteredCircuitJson = filterReferenceSchematic({
    circuitJson,
    removedComponentNames,
  })
  const retainedSchematicTraceIds = new Set(
    filteredCircuitJson.flatMap((element) =>
      isSchematicTrace(element) ? [element.schematic_trace_id] : [],
    ),
  )

  for (const schematicTraceId of affectedPortLeadIds) {
    expect(retainedSchematicTraceIds.has(schematicTraceId)).toBe(false)
  }
})

async function readLmg342xSchematic(): Promise<AnyCircuitElement[]> {
  const file = Bun.file(
    new URL("../lib/generated/ti-evms/lmg342x-bb-evm.schematic.circuit.json.gz", import.meta.url),
  )
  return JSON.parse(
    strFromU8(gunzipSync(new Uint8Array(await file.arrayBuffer()))),
  ) as AnyCircuitElement[]
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
    Array.isArray(element.edges)
  )
}
