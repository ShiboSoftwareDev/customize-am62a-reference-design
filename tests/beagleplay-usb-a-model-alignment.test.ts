import { expect, test } from "bun:test"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

test("aligns the BeaglePlay USB-A shell with its board-edge footprint", () => {
  const replacement = getCadModelReplacement({
    altiumFootprint: "USB7P_1R4_14X5R72MM",
    componentName: "J13",
  })

  expect(replacement?.kind).toBe("jscad")
  if (replacement?.kind !== "jscad") throw new Error("Expected a JSCAD replacement")

  expect(replacement.modelYawOffsetDegrees).toBe(-90)
  expect(replacement.modelPlanarOffsetMillimeters).toEqual({ x: 0, y: -5.04 })
})
