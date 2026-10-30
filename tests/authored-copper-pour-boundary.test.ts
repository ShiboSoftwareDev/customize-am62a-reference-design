import { expect, test } from "bun:test"
import { convertAltiumPcbDocToCircuitJson } from "altium-to-circuit-json"
import { parseAltiumPcbDoc } from "altiumts"
import { prepareAuthoredCopperPours } from "../scripts/ti-evm-reference-generator/prepare-authored-copper-pours"

test("restores a ground polygon boundary instead of baking a removed connector's pad clearance into it", () => {
  const pcbDocument = parseAltiumPcbDoc(
    [
      "|RECORD=Board|VERSION=5.0|KIND0=0|VX0=0mil|VY0=0mil|KIND1=0|VX1=500mil|VY1=0mil|KIND2=0|VX2=500mil|VY2=400mil|KIND3=0|VX3=0mil|VY3=400mil",
      "|RECORD=Net|ID=0|NAME=GND",
      "|RECORD=Polygon|LAYER=TOP|NET=0|POURINDEX=1|KIND0=0|VX0=20mil|VY0=20mil|KIND1=0|VX1=480mil|VY1=20mil|KIND2=0|VX2=480mil|VY2=380mil|KIND3=0|VX3=20mil|VY3=380mil",
      "|RECORD=Region|LAYER=TOP|REGIONKIND=COPPER|NET=0|POLYGON=0|HOLECOUNT=1|KIND0=0|VX0=20mil|VY0=20mil|KIND1=0|VX1=480mil|VY1=20mil|KIND2=0|VX2=480mil|VY2=380mil|KIND3=0|VX3=20mil|VY3=380mil|HOLE0COUNT=4|HOLE0VX0=200mil|HOLE0VY0=150mil|HOLE0VX1=300mil|HOLE0VY1=150mil|HOLE0VX2=300mil|HOLE0VY2=250mil|HOLE0VX3=200mil|HOLE0VY3=250mil",
      "|RECORD=Rule|RULEKIND=Clearance|ENABLED=TRUE|SCOPE1EXPRESSION=All|SCOPE2EXPRESSION=All|GAP=4mil",
    ].join("\n"),
  )
  const circuitJson = convertAltiumPcbDocToCircuitJson(pcbDocument)
  expect(circuitJson.find((element) => element.type === "pcb_copper_pour")?.shape).toBe("brep")
  const prepared = prepareAuthoredCopperPours({
    pcbDocument,
    circuitJson,
    featureIdBySourceComponentId: new Map(),
  })
  const pours = prepared.circuitJson.filter((element) => element.type === "pcb_copper_pour")
  expect(pours).toHaveLength(2)
  expect(pours[0]).toMatchObject({
    pcb_copper_pour_id: "pcb_copper_pour_authored_0",
    layer: "top",
    shape: "polygon",
    points: [
      { x: 0.508, y: 0.508 },
      { x: 12.192, y: 0.508 },
      { x: 12.192, y: 9.652 },
      { x: 0.508, y: 9.652 },
    ],
  })
  expect(
    prepared.computedCopperPourSettingsById.get("pcb_copper_pour_authored_0")?.clearance,
  ).toBeCloseTo(0.1016)
  expect(pours[1]).toMatchObject({
    shape: "brep",
    pcb_copper_pour_id: "reference_pcb_copper_pour_altium_region_3",
  })
  expect(
    prepared.computedCopperPourSettingsById.get("reference_pcb_copper_pour_altium_region_3"),
  ).toEqual({
    clearance: 0,
    preserveReferenceCopper: true,
    removableFeatureId: undefined,
  })
})
