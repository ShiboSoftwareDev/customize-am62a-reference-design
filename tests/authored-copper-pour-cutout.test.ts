import { expect, test } from "bun:test"
import { convertAltiumPcbDocToCircuitJson } from "altium-to-circuit-json"
import { parseAltiumPcbDoc } from "altiumts"
import { prepareAuthoredCopperPours } from "../scripts/ti-evm-reference-generator/prepare-authored-copper-pours"

test("keeps an intentional polygon cutout when discarding cached pad-clearance holes", () => {
  const pcbDocument = parseAltiumPcbDoc(
    [
      "|RECORD=Board|VERSION=5.0|KIND0=0|VX0=0mil|VY0=0mil|KIND1=0|VX1=500mil|VY1=0mil|KIND2=0|VX2=500mil|VY2=400mil|KIND3=0|VX3=0mil|VY3=400mil",
      "|RECORD=Net|ID=0|NAME=GND",
      "|RECORD=Polygon|LAYER=TOP|NET=0|KIND0=0|VX0=20mil|VY0=20mil|KIND1=0|VX1=480mil|VY1=20mil|KIND2=0|VX2=480mil|VY2=380mil|KIND3=0|VX3=20mil|VY3=380mil",
      "|RECORD=Region|LAYER=TOP|REGIONKIND=POLYGON_CUTOUT|POLYGON=0|KIND0=0|VX0=200mil|VY0=150mil|KIND1=0|VX1=300mil|VY1=150mil|KIND2=0|VX2=300mil|VY2=250mil|KIND3=0|VX3=200mil|VY3=250mil",
      "|RECORD=Rule|RULEKIND=Clearance|ENABLED=TRUE|SCOPE1EXPRESSION=All|SCOPE2EXPRESSION=All|GAP=4mil",
    ].join("\n"),
  )
  const prepared = prepareAuthoredCopperPours({
    pcbDocument,
    circuitJson: convertAltiumPcbDocToCircuitJson(pcbDocument),
    featureIdBySourceComponentId: new Map(),
  })
  const pour = prepared.circuitJson.find((element) => element.type === "pcb_copper_pour")
  expect(pour).toMatchObject({
    shape: "brep",
    brep_shape: { inner_rings: [{ vertices: expect.arrayContaining([{ x: 5.08, y: 3.81 }]) }] },
  })
})
