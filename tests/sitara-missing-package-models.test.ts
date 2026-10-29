import { expect, test } from "bun:test"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

test("replaces fitted Sitara packages that previously rendered as generic boxes", () => {
  for (const [componentName, altiumFootprint] of [
    ["A1", "ANT2_W3006_390X130_SMD"],
    ["B1", "BF10_50X5_200X125X80MM"],
    ["D1", "DIO_DFN0402_100X60X40MM"],
    ["D13", "DIO_DFN0201_65X40X30MM"],
    ["D18", "DIO_SOD323_250X125X95MM"],
    ["F1", "F0603"],
    ["J1", "SIP6"],
    ["RT1", "POLYSW200-5638-310"],
    ["U3", "DCK5_190X290X110MM"],
    ["U8", "DGN-16X60"],
    ["U9", "U_6_DRY"],
    ["U10", "U_8_DCU"],
    ["U25", "EMIFIL_NFM15CC_0402"],
  ]) {
    expect(
      getCadModelReplacement({ altiumFootprint, componentName })?.kind,
      `${componentName} ${altiumFootprint}`,
    ).toBeDefined()
  }
})
