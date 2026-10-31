import { expect, test } from "bun:test"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

test("omits solid CAD bodies for test pads and assembly markers", () => {
  for (const componentIdentity of [
    { altiumFootprint: "TP20_SMD", componentName: "TP1" },
    { altiumFootprint: "Fiducial10-20", componentName: "FID1" },
    { altiumFootprint: "MTGH200C125D_PL", componentName: "MTG1" },
    { altiumFootprint: "PTH_3_125MM_5", componentName: "MH1" },
  ]) {
    expect(getCadModelReplacement(componentIdentity)).toEqual({ kind: "none" })
  }
})
