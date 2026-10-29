import { expect, test } from "bun:test"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

test("preserves authored SON and DFN body dimensions", () => {
  const cases = [
    {
      altiumFootprint: "SON8P_150X150X50MM",
      footprinterString: "dfn8_w1.5mm_h1.5mm_bodywidth1.5mm_bodylength1.5mm_p0.5mm",
    },
    {
      altiumFootprint: "WSON6_0D65_2X2X0_8MM",
      footprinterString: "dfn6_w2mm_h2mm_bodywidth2mm_bodylength2mm_p0.5mm",
    },
    {
      altiumFootprint: "VSON6_0D5_1D5X1D5X1MM",
      footprinterString: "dfn6_w1.5mm_h1.5mm_bodywidth1.5mm_bodylength1.5mm_p0.5mm",
    },
    {
      altiumFootprint: "USON10_0D5_2D5X1X0D5MM",
      footprinterString: "dfn10_w2.5mm_h1mm_bodywidth2.5mm_bodylength1mm_p0.5mm",
    },
  ]

  for (const { altiumFootprint, footprinterString } of cases) {
    expect(getCadModelReplacement({ altiumFootprint, componentName: "U1" })).toEqual({
      kind: "footprinter",
      footprinterString,
    })
  }
})
