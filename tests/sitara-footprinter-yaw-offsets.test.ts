import { expect, test } from "bun:test"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

test("applies source-footprint axis corrections to affected Sitara packages", () => {
  for (const [componentName, altiumFootprint] of [
    ["J6", "HEADER3P_2D54_DIP"],
    ["J16", "HEADER2P_2D54_DIP"],
    ["U11", "VSSOP8_0D65_3X3X1_1MM"],
    ["D6", "TSSOP10"],
    ["D7", "TSSOP10"],
  ]) {
    expect(getCadModelReplacement({ altiumFootprint, componentName })).toMatchObject({
      kind: "footprinter",
      modelYawOffsetDegrees: 90,
    })
  }
})
