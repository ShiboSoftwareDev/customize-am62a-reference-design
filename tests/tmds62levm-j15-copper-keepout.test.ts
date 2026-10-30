import { expect, test } from "bun:test"
import "bun-match-svg"
import { convertCircuitJsonToPcbSvg } from "circuit-to-svg"
import { renderJ15CopperKeepout } from "./fixtures/render-j15-copper-keepout"
import { copperContainsPoint } from "./fixtures/copper-contains-point"

test("TMDS62LEVM J15 mounting-peg keepout survives Altium -> TSX -> Core on both copper layers", async () => {
  const circuitJson = await renderJ15CopperKeepout()
  const forbiddenPoint = { x: -0.75, y: -0.75 }
  expect(circuitJson.filter((element) => element.type.endsWith("_error"))).toEqual([])
  for (const layer of ["top", "bottom"]) {
    const pours = circuitJson.filter(
      (element) => element.type === "pcb_copper_pour" && element.layer === layer,
    )
    expect(pours.length).toBeGreaterThan(0)
    expect(copperContainsPoint({ circuitJson, point: forbiddenPoint, layer })).toBe(false)
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
