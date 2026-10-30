import { expect, test } from "bun:test"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import { getTiEvm } from "lib/ti-evm-catalog"

test("marks only SK-AM62 source sheets whose imported diagrams are missing", async () => {
  const evm = getTiEvm("sk-am62")
  expect(evm.unavailableSchematicSheetLabels).toEqual([
    "03.SchDoc",
    "04.SchDoc",
    "05.SchDoc",
    "06.SchDoc",
    "07.SchDoc",
    "08.SchDoc",
  ])
  for (const label of evm.unavailableSchematicSheetLabels ?? []) {
    const index = evm.schematicSheetLabels.indexOf(label)
    expect(index).toBeGreaterThanOrEqual(0)
    const url = evm.variants[0].schematicCircuitJsonUrls[index]
    const circuitJson = parsePrebuiltCircuitJson(
      new Uint8Array(await Bun.file(`public${url}`).arrayBuffer()),
    )
    expect(circuitJson.some((element) => element.type === "schematic_port")).toBe(false)
    expect(circuitJson.some((element) => element.type === "schematic_trace")).toBe(false)
  }
})
