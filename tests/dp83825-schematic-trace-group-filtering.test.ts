import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { gunzipSync, strFromU8 } from "fflate"
import { filterReferenceSchematic } from "../lib/evms/filter-reference-schematic"
import { dp83825EvmDefinition } from "../lib/generated/ti-evms/dp83825evm.generated"

type SourceTraceId = string
type SchematicTraceId = string
type SchematicTrace = AnyCircuitElement & {
  edges: Array<{
    from: { x: number; y: number }
    from_schematic_port_id?: string
    to: { x: number; y: number }
    to_schematic_port_id?: string
  }>
  schematic_trace_id: SchematicTraceId
  source_trace_id?: SourceTraceId
}

test("DP83825 configuration removal prunes disconnected trace elements", async () => {
  const circuitJson = await readDp83825Schematic()
  const removedComponentNames = new Set(
    dp83825EvmDefinition.components.flatMap((component) =>
      component.removableFeatureId === "configuration-headers" ? [component.name] : [],
    ),
  )
  const filteredCircuitJson = filterReferenceSchematic({
    circuitJson,
    removedComponentNames,
  })
  const retainedTracesById = new Map(
    filteredCircuitJson.flatMap((element) =>
      isSchematicTrace(element) ? [[element.schematic_trace_id, element] as const] : [],
    ),
  )

  expect(retainedTracesById.has("schematic_trace_altium_4571")).toBeFalse()
  expect(retainedTracesById.has("schematic_trace_altium_4568")).toBeFalse()
  expect(retainedTracesById.has("schematic_trace_altium_4575")).toBeFalse()
  expect(filteredCircuitJson).toContainEqual(
    expect.objectContaining({ type: "source_component", name: "U3" }),
  )
})

async function readDp83825Schematic(): Promise<AnyCircuitElement[]> {
  const file = Bun.file(
    new URL("../lib/generated/ti-evms/dp83825evm.schematic.circuit.json.gz", import.meta.url),
  )
  return JSON.parse(
    strFromU8(gunzipSync(new Uint8Array(await file.arrayBuffer()))),
  ) as AnyCircuitElement[]
}

function isSchematicTrace(element: AnyCircuitElement): element is SchematicTrace {
  return (
    element.type === "schematic_trace" &&
    typeof element.schematic_trace_id === "string" &&
    Array.isArray(element.edges)
  )
}
