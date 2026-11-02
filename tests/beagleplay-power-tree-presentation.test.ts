import { expect, test } from "bun:test"
import "bun-match-svg"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"
import { convertCircuitJsonToSchematicSvg } from "circuit-to-svg"

test("BeaglePlay power-tree presentation", async () => {
  const circuitJson = parsePrebuiltCircuitJson(
    await Bun.file(
      new URL("../lib/generated/ti-evms/beagleplay.schematic-3.circuit.json.gz", import.meta.url),
    ).bytes(),
  )
  const titleTexts = circuitJson
    .filter((element) => element.type === "schematic_text")
    .map((element) => element.text)
  for (const expectedTitle of ["BeaglePlay", "003_Power Tree", "v0.2", "qxn"]) {
    expect(titleTexts).toContain(expectedTitle)
  }
  expect(titleTexts).not.toContain("=Schematic Name")
  expect(titleTexts).not.toContain("=Page Number")
  await expect(
    convertCircuitJsonToSchematicSvg(circuitJson, { includeVersion: false }),
  ).toMatchSvgSnapshot(import.meta.path)
})
