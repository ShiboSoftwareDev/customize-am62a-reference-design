import { expect, test } from "bun:test"
import { isPointInsidePolygon } from "@tscircuit/math-utils"
import { parseAltiumPcbDoc } from "altiumts"
import { getSourceCopperKeepouts } from "../scripts/ti-evm-reference-generator/get-source-copper-keepouts"

test("a rotated fill keepout uses its board-space contour", () => {
  const pcbDocument = parseAltiumPcbDoc(
    [
      "|RECORD=Board|VERSION=5.0",
      "|RECORD=Fill|LAYER=TOP|KEEPOUT=TRUE|KEEPOUTRESTRICTIONS=4|X1=100mil|Y1=100mil|X2=300mil|Y2=200mil|ROTATION=90",
    ].join("\n"),
  )
  const [keepout] = getSourceCopperKeepouts({ pcbDocument, featureIdByComponentName: new Map() })
  expect(keepout).toBeDefined()
  const outline = keepout!.polygon[0]!.map(([x, y]) => ({ x, y }))
  expect(isPointInsidePolygon({ x: 200 * 0.0254, y: 240 * 0.0254 }, outline)).toBe(true)
  expect(isPointInsidePolygon({ x: 290 * 0.0254, y: 150 * 0.0254 }, outline)).toBe(false)
})
