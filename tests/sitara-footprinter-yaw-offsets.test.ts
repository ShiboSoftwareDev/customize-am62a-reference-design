import { expect, test } from "bun:test"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

test("applies source-footprint axis corrections to affected Sitara packages", () => {
  for (const [componentName, altiumFootprint] of [
    ["J6", "HEADER3P_2D54_DIP"],
    ["J16", "HEADER2P_2D54_DIP"],
  ]) {
    expect(getCadModelReplacement({ altiumFootprint, componentName })).toMatchObject({
      kind: "footprinter",
      modelYawOffsetDegrees: 90,
    })
  }
  for (const [componentName, altiumFootprint, modelFootprintString] of [
    ["U11", "VSSOP8_0D65_3X3X1_1MM", "msop8_p0.65mm"],
    ["D6", "TSSOP10", "msop10_p0.5mm"],
    ["D7", "TSSOP10", "msop10_p0.5mm"],
  ]) {
    expect(getCadModelReplacement({ altiumFootprint, componentName })).toMatchObject({
      kind: "step",
      modelFootprintString,
    })
  }
})
