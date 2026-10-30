import { expect, test } from "bun:test"
import "bun-match-svg"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { copperContainsPoint } from "./fixtures/copper-contains-point"
import { renderJ15CopperKeepout } from "./fixtures/render-j15-copper-keepout"

test("omitting J15 removes its copper restriction and lets ground refill the cleared area", async () => {
  const circuitJson = await renderJ15CopperKeepout(["usb"])
  const point = { x: -0.75, y: -0.75 }
  expect(circuitJson.filter((element) => element.type.endsWith("_error"))).toEqual([])
  for (const layer of ["top", "bottom"]) {
    expect(copperContainsPoint({ circuitJson, point, layer })).toBe(true)
  }
  await expect(
    convertCircuitJsonToPcbSvg(circuitJson, {
      includeVersion: false,
      layer: "top",
      hiddenLayerOpacity: 0,
      showErrorsInTextOverlay: false,
      viewport: { minX: -3.5, maxX: 3.5, minY: -3.5, maxY: 3.5 },
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
