import { expect, test } from "bun:test"
import { parseAltiumPcbDoc } from "altiumts"
import { getSourceCopperKeepouts } from "../scripts/ti-evm-reference-generator/get-source-copper-keepouts"

test("source keepouts respect copper masks, legacy masks, layers, and component ownership", () => {
  const pcbDocument = parseAltiumPcbDoc(
    [
      "|RECORD=Board|VERSION=5.0",
      "|RECORD=Component|ID=0|SOURCEDESIGNATOR=J1|LAYER=TOP|X=1000mil|Y=2000mil|ROTATION=90",
      ...["1", "4", "7", undefined].map(
        (restrictions) =>
          `|RECORD=Region|LAYER=MID-LAYER1|REGIONKIND=COPPER|KEEPOUT=TRUE|COMPONENT=0${restrictions ? `|KEEPOUTRESTRICTIONS=${restrictions}` : ""}|KIND0=0|VX0=100mil|VY0=100mil|KIND1=0|VX1=200mil|VY1=100mil|KIND2=0|VX2=200mil|VY2=200mil|KIND3=0|VX3=100mil|VY3=200mil`,
      ),
    ].join("\n"),
  )
  const keepouts = getSourceCopperKeepouts({
    pcbDocument,
    featureIdByComponentName: new Map([["J1", "expansion"]]),
  })
  expect(keepouts.map((keepout) => keepout.sourceRecordIndex)).toEqual([3, 4, 5])
  expect(keepouts.every((keepout) => keepout.layer === "MID1")).toBe(true)
  expect(keepouts.every((keepout) => keepout.removableFeatureId === "expansion")).toBe(true)
  expect(keepouts[0]?.polygon[0]?.[0]).toEqual([2.54, 2.54])
})
