import { expect, test } from "bun:test"
import { createDipSwitchCadModel } from "../scripts/prebuild-ti-evm-cad-scenes/create-dip-switch-cad-model"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

test("selects the two-, four-, and eight-pole banks used by the Sitara footprints", () => {
  for (const { altiumFootprint, poleCount } of [
    { altiumFootprint: "SW4_49-99_150X230_SMD_2-7", poleCount: 2 },
    { altiumFootprint: "SW8_416131160804_260X230_SMD_2-7", poleCount: 4 },
    { altiumFootprint: "SW16_416131160808_460X230_SMD_2-7", poleCount: 8 },
  ] as const) {
    expect(getCadModelReplacement({ altiumFootprint, componentName: "SW1" })).toEqual({
      kind: "jscad",
      jscadOperations: createDipSwitchCadModel({ poleCount }),
    })
  }
})
