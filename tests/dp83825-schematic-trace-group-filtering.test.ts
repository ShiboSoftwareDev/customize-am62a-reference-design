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
  junctions?: Array<{ x: number; y: number }>
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
  expect(filteredCircuitJson).not.toContainEqual(
    expect.objectContaining({ source_trace_id: "source_trace_altium_51" }),
  )
  expect(filteredCircuitJson).not.toContainEqual(
    expect.objectContaining({
      schematic_text_id: "schematic_inline_net_label_altium_3304",
      text: "RX_D1",
    }),
  )
  expect(filteredCircuitJson).not.toContainEqual(
    expect.objectContaining({
      schematic_text_id: "schematic_inline_net_label_altium_5174",
      text: "RX_D1_S",
    }),
  )
  expect(filteredCircuitJson).toContainEqual(
    expect.objectContaining({
      schematic_text_id: "schematic_inline_net_label_altium_717",
      text: "RX_D1",
    }),
  )
  expect(filteredCircuitJson).not.toContainEqual(
    expect.objectContaining({ schematic_line_id: "schematic_line_altium_4588_a" }),
  )
  expect(filteredCircuitJson).not.toContainEqual(
    expect.objectContaining({ schematic_line_id: "schematic_line_altium_4588_b" }),
  )
  expect(filteredCircuitJson).toContainEqual(
    expect.objectContaining({ schematic_line_id: "schematic_line_altium_5424_a" }),
  )
  expect(
    filteredCircuitJson.flatMap((element) =>
      isSchematicTrace(element) ? (element.junctions ?? []) : [],
    ),
  ).not.toContainEqual({ x: -10.235757295044003, y: 6.580129689671146 })
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
