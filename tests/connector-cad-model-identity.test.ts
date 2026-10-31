import { expect, test } from "bun:test"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

test("uses package identity instead of broad connector substitutions", () => {
  expect(
    getCadModelReplacement({
      altiumFootprint: "HDR_2X15_PEC15DAAN_S_T_8-6",
      componentName: "J1",
    }),
  ).toEqual({
    kind: "footprinter",
    footprinterString: "headermodule30_rows2_p2.54mm_male",
  })
  expect(
    getCadModelReplacement({
      altiumFootprint: "CON_RJ45-14_LPJG16314A4NL_S_R_T_13-6",
      componentName: "J2",
      manufacturerPartNumber: "LPJG16314A4NL",
    })?.kind,
  ).toBe("jscad")
  expect(
    getCadModelReplacement({
      altiumFootprint: "CON_USBC24_2012670_S_R_S_3-9",
      componentName: "J3",
      manufacturerPartNumber: "2012670005",
    })?.kind,
  ).toBe("jscad")
  expect(
    getCadModelReplacement({
      altiumFootprint: "CON_USB_CUSTOM",
      componentName: "J4",
    }),
  ).toBeUndefined()
})
