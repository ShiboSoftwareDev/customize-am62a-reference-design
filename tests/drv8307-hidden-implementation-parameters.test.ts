import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { gunzipSync, strFromU8 } from "fflate"

test("DRV8307 generated schematic excludes hidden implementation parameters", async () => {
  const file = Bun.file(
    new URL("../lib/generated/ti-evms/drv8307evm.schematic.circuit.json.gz", import.meta.url),
  )
  const circuitJson = JSON.parse(
    strFromU8(gunzipSync(new Uint8Array(await file.arrayBuffer()))),
  ) as AnyCircuitElement[]
  const schematicTexts = circuitJson.flatMap((element) =>
    element.type === "schematic_text" && typeof element.text === "string" ? [element.text] : [],
  )

  expect(schematicTexts).not.toContain("Excluded Parts")
  expect(schematicTexts.some((text) => text.startsWith("@DESIGNATOR"))).toBe(false)
})
