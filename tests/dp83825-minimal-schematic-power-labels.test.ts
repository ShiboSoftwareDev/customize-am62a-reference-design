import { expect, test } from "bun:test"
import "bun-match-svg"
import type { AnyCircuitElement } from "circuit-json"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"
import { gunzipSync, strFromU8 } from "fflate"
import { filterReferenceSchematic } from "../lib/evms/filter-reference-schematic"
import { dp83825EvmDefinition } from "../lib/generated/ti-evms/dp83825evm.generated"

type SchematicNetLabelId = string
type SchematicTraceId = string
type SchematicNetLabel = AnyCircuitElement & {
  schematic_net_label_id: SchematicNetLabelId
  schematic_trace_id?: SchematicTraceId
}

test("DP83825 minimal retains power labels on populated resistors", async () => {
  const circuitJson = await readDp83825Schematic()
  const removedComponentNames = new Set(
    dp83825EvmDefinition.components.flatMap((component) =>
      component.removableFeatureId ? [component.name] : [],
    ),
  )
  const filteredCircuitJson = filterReferenceSchematic({
    circuitJson,
    removedComponentNames,
  })

  for (const schematicNetLabelId of [
    "schematic_net_label_altium_2786",
    "schematic_net_label_altium_5524",
  ]) {
    const schematicNetLabel = filteredCircuitJson.find(
      (element): element is SchematicNetLabel =>
        element.type === "schematic_net_label" &&
        element.schematic_net_label_id === schematicNetLabelId,
    )
    expect(schematicNetLabel).toBeDefined()
    expect(
      filteredCircuitJson.some(
        (element) =>
          element.type === "schematic_trace" &&
          element.schematic_trace_id === schematicNetLabel?.schematic_trace_id,
      ),
    ).toBe(true)
  }

  const schematicSvg = convertCircuitJsonToSchematicSvg(filteredCircuitJson, {
    includeVersion: false,
  }).replace(/[ \t]+$/gmu, "")
  await expect(schematicSvg).toMatchSvgSnapshot(import.meta.path)
})

async function readDp83825Schematic(): Promise<AnyCircuitElement[]> {
  const file = Bun.file(
    new URL("../lib/generated/ti-evms/dp83825evm.schematic.circuit.json.gz", import.meta.url),
  )
  return JSON.parse(
    strFromU8(gunzipSync(new Uint8Array(await file.arrayBuffer()))),
  ) as AnyCircuitElement[]
}
