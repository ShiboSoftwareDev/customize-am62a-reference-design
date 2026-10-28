import { expect, test } from "bun:test"
import { getCadModelReplacementForAltiumFootprint } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement-for-altium-footprint"

test("maps verified Altium footprints to reusable CAD models", () => {
  expect(getCadModelReplacementForAltiumFootprint("CAP0201_0-5")).toBeUndefined()
  expect(getCadModelReplacementForAltiumFootprint("RES0402_0-5")).toBeUndefined()
  expect(getCadModelReplacementForAltiumFootprint("SOT23-5_1-5")).toBeUndefined()
  expect(getCadModelReplacementForAltiumFootprint("HDR_2X15_PEC15DAAN_S_T_8-6")).toEqual({
    kind: "footprinter",
    footprinterString: "headermodule30_rows2_p2.54mm_male",
  })
  expect(getCadModelReplacementForAltiumFootprint("HEADER23X2")).toEqual({
    kind: "footprinter",
    footprinterString: "headermodule46_rows2_p2.54mm_male",
  })
  expect(getCadModelReplacementForAltiumFootprint("CON_USBC24_2012670_S_R_S_3-9")).toEqual({
    fitHeightMm: 4.18,
    kind: "step",
    modelStepUrl: "/cad-models/kicad/USB_C_Receptacle_Amphenol_12401610E4-2A.step",
  })
  expect(getCadModelReplacementForAltiumFootprint("CON_MUSBB5_629105150521_S_R_S_2-7")).toEqual({
    fitHeightMm: 2.94,
    kind: "step",
    modelStepUrl: "/cad-models/kicad/USB_Micro-B_Molex_47346-0001.step",
  })
  expect(getCadModelReplacementForAltiumFootprint("RJ45-7499010211A")).toEqual({
    fitHeightMm: 18.68,
    kind: "step",
    modelStepUrl: "/cad-models/kicad/RJ45_Amphenol_RJHSE538X.step",
  })
  expect(getCadModelReplacementForAltiumFootprint("CON_RJ45-14_LPJG16314A4NL_S_R_T_13-6")).toEqual({
    kind: "footprinter",
    footprinterString: "rj45_pins14_w16mm_h20mm",
  })
  expect(getCadModelReplacementForAltiumFootprint("UNKNOWN_CUSTOM_PACKAGE")).toBeUndefined()
})
