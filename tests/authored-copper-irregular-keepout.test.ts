import { expect, test } from "bun:test"
import { convertAltiumPcbDocToCircuitJson } from "altium-to-circuit-json"
import { parseAltiumPcbDoc } from "altiumts"
import { prepareAuthoredCopperPours } from "../scripts/ti-evm-reference-generator/prepare-authored-copper-pours"
import { copperContainsPoint } from "./fixtures/copper-contains-point"

test("an irregular top-layer keepout clips an intersecting boundary without cutting its bounding box or bottom copper", () => {
  const pcbDocument = parseAltiumPcbDoc(
    [
      "|RECORD=Board|VERSION=5.0|KIND0=0|VX0=0mil|VY0=0mil|KIND1=0|VX1=400mil|VY1=0mil|KIND2=0|VX2=400mil|VY2=400mil|KIND3=0|VX3=0mil|VY3=400mil",
      "|RECORD=Net|ID=0|NAME=GND",
      ...["TOP", "BOTTOM"].map(
        (layer) =>
          `|RECORD=Polygon|LAYER=${layer}|NET=0|KIND0=0|VX0=50mil|VY0=50mil|KIND1=0|VX1=350mil|VY1=50mil|KIND2=0|VX2=350mil|VY2=350mil|KIND3=0|VX3=50mil|VY3=350mil`,
      ),
      "|RECORD=Region|LAYER=TOP|REGIONKIND=COPPER|KEEPOUT=TRUE|KEEPOUTRESTRICTIONS=4|KIND0=0|VX0=25mil|VY0=100mil|KIND1=0|VX1=200mil|VY1=100mil|KIND2=0|VX2=200mil|VY2=140mil|KIND3=0|VX3=140mil|VY3=140mil|KIND4=0|VX4=140mil|VY4=200mil|KIND5=0|VX5=25mil|VY5=200mil",
      "|RECORD=Rule|RULEKIND=Clearance|ENABLED=TRUE|SCOPE1EXPRESSION=All|SCOPE2EXPRESSION=All|GAP=4mil",
    ].join("\n"),
  )
  const { circuitJson } = prepareAuthoredCopperPours({
    pcbDocument,
    circuitJson: convertAltiumPcbDocToCircuitJson(pcbDocument),
    featureIdBySourceComponentId: new Map(),
  })
  const blockedPoint = { x: 120 * 0.0254, y: 170 * 0.0254 }
  const notchPoint = { x: 170 * 0.0254, y: 170 * 0.0254 }
  expect(copperContainsPoint({ circuitJson, point: blockedPoint, layer: "top" })).toBe(false)
  expect(copperContainsPoint({ circuitJson, point: notchPoint, layer: "top" })).toBe(true)
  // The source's 4 mil gap must also clear copper just outside the keepout edge.
  expect(
    copperContainsPoint({
      circuitJson,
      point: { x: 200 * 0.0254 + 0.05, y: 120 * 0.0254 },
      layer: "top",
    }),
  ).toBe(false)
  expect(copperContainsPoint({ circuitJson, point: blockedPoint, layer: "bottom" })).toBe(true)
})
