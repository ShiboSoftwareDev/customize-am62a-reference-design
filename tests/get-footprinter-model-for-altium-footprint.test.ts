import { expect, test } from "bun:test"
import { getFootprinterModelForAltiumFootprint } from "../scripts/prebuild-ti-evm-cad-scenes/get-footprinter-model-for-altium-footprint"

test("maps supported Altium footprint families to tscircuit package models", () => {
  expect(getFootprinterModelForAltiumFootprint("CAP0201_0-5")).toBeUndefined()
  expect(getFootprinterModelForAltiumFootprint("RES0402_0-5")).toBeUndefined()
  expect(getFootprinterModelForAltiumFootprint("HDR_2X15_PEC15DAAN_S_T_8-6")).toBe(
    "headermodule30_rows2_p2.54mm_male",
  )
  expect(getFootprinterModelForAltiumFootprint("HEADER23X2")).toBe(
    "headermodule46_rows2_p2.54mm_male",
  )
  expect(getFootprinterModelForAltiumFootprint("HDR_2X10_FTR-110-51-D-06_S_S_8-7")).toBeUndefined()
  expect(
    getFootprinterModelForAltiumFootprint("FPC22_0D5_15_4X5_25X2MM_0D5_DX_NPWB"),
  ).toBeUndefined()
  expect(getFootprinterModelForAltiumFootprint("CON_RJ45-14_LPJG16314A4NL_S_R_T_13-6")).toBe(
    "rj45_pins14_w16mm_h20mm",
  )
  expect(getFootprinterModelForAltiumFootprint("RJ45_18P_21_23X15_93X13_3MM")).toBeUndefined()
  expect(getFootprinterModelForAltiumFootprint("UNKNOWN_CUSTOM_PACKAGE")).toBeUndefined()
})
