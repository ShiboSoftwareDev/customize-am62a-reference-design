import { expect, test } from "bun:test"
import { convertAltiumPcbDocToCircuitJson } from "altium-to-circuit-json"
import { parseAltiumPcbDoc } from "altiumts"
import { prepareAuthoredCopperPours } from "../scripts/ti-evm-reference-generator/prepare-authored-copper-pours"

test("retains standalone copper fills while replacing only polygon-owned cached regions", () => {
  const pcbDocument = parseAltiumPcbDoc(
    [
      "|RECORD=Board|VERSION=5.0|KIND0=0|VX0=0mil|VY0=0mil|KIND1=0|VX1=500mil|VY1=0mil|KIND2=0|VX2=500mil|VY2=400mil|KIND3=0|VX3=0mil|VY3=400mil",
      "|RECORD=Net|ID=0|NAME=GND",
      "|RECORD=Track|LAYER=TOP|NET=0|X1=200mil|Y1=200mil|X2=250mil|Y2=200mil|WIDTH=4mil",
      "|RECORD=Fill|LAYER=TOP|NET=0|X1=40mil|Y1=40mil|X2=100mil|Y2=100mil",
    ].join("\n"),
  )
  const circuitJson = convertAltiumPcbDocToCircuitJson(pcbDocument)
  const prepared = prepareAuthoredCopperPours({
    pcbDocument,
    circuitJson,
    featureIdBySourceComponentId: new Map(),
  })
  expect(prepared.circuitJson.filter((element) => element.type === "pcb_copper_pour")).toEqual(
    circuitJson.filter((element) => element.type === "pcb_copper_pour"),
  )
  expect([...prepared.computedCopperPourSettingsById.values()]).toEqual([
    { clearance: 0, preserveReferenceCopper: true, removableFeatureId: undefined },
  ])
})
