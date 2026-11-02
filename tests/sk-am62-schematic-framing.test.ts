import { expect, test } from "bun:test"
import "bun-match-svg"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"

test("SK-AM62 JTAG sheet framing", async () => {
  const circuitJson = parsePrebuiltCircuitJson(
    await Bun.file(
      new URL("../lib/generated/ti-evms/sk-am62.schematic-30.circuit.json.gz", import.meta.url),
    ).bytes(),
  )
  await expect(
    convertCircuitJsonToSchematicSvg(circuitJson, { includeVersion: false }),
  ).toMatchSvgSnapshot(import.meta.path)
})
