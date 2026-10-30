import { expect, test } from "bun:test"
import { convertAltiumPcbDocToCircuitJson } from "altium-to-circuit-json"
import { parseAltiumPcbDoc } from "altiumts"
import { prepareAuthoredCopperPours } from "../scripts/ti-evm-reference-generator/prepare-authored-copper-pours"

test("reconverts standalone copper so old keepout imports cannot obstruct new pours", () => {
  const pcbDocument = parseAltiumPcbDoc(
    [
      "|RECORD=Board|VERSION=5.0|KIND0=0|VX0=0mil|VY0=0mil|KIND1=0|VX1=500mil|VY1=0mil|KIND2=0|VX2=500mil|VY2=400mil|KIND3=0|VX3=0mil|VY3=400mil",
      "|RECORD=Region|LAYER=BOTTOM|REGIONKIND=COPPER|KEEPOUT=TRUE|KIND0=0|VX0=50mil|VY0=50mil|KIND1=0|VX1=102mil|VY1=50mil|KIND2=0|VX2=102mil|VY2=93mil|KIND3=0|VX3=50mil|VY3=93mil",
    ].join("\n"),
  )
  const circuitJson = convertAltiumPcbDocToCircuitJson(pcbDocument)
  // Earlier converter output incorrectly represented this pad keepout as copper.
  const prepared = prepareAuthoredCopperPours({
    pcbDocument,
    featureIdBySourceComponentId: new Map(),
    circuitJson: [
      ...circuitJson,
      {
        type: "pcb_copper_pour",
        pcb_copper_pour_id: "pcb_copper_pour_altium_region_1",
        layer: "bottom",
        shape: "polygon",
        points: [
          { x: 1, y: 1 },
          { x: 3, y: 1 },
          { x: 3, y: 3 },
          { x: 1, y: 3 },
        ],
      },
    ],
  })
  expect(prepared.circuitJson.some(({ type }) => type === "pcb_copper_pour")).toBe(false)
})
