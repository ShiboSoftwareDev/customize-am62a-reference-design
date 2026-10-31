import { expect, test } from "bun:test"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

test("uses the exact TE model for the TMDS62L M.2 socket", () => {
  expect(
    getCadModelReplacement({
      altiumFootprint: "CON_MINIPCI75_2199119-4_S_R_S_3-2_2244",
      componentName: "J4",
    }),
  ).toEqual({
    kind: "glb",
    modelGlbUrl:
      "https://static.ultralibrarian.com/part-previews/3d-models/" +
      "E72/8E9/789/B39/4182448-c-2199119-4-c-3d.glb",
    modelPlanarOffsetMillimeters: { x: 0, y: 4 },
    modelUnitToMmScaleFactor: 1000,
    modelVerticalOffsetMillimeters: 1.385,
  })
})
