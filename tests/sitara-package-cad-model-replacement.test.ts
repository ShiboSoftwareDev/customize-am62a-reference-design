import { expect, test } from "bun:test"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

test("replaces prominent Sitara packages with recognizable package models", () => {
  for (const componentIdentity of [
    { altiumFootprint: "AM33XX_15X15", componentName: "U5" },
    { altiumFootprint: "BGA96_T9_P8_10_3X13_3", componentName: "U12" },
    { altiumFootprint: "MOD100_WL18", componentName: "MOD1" },
    { altiumFootprint: "L4P_2D54", componentName: "L1" },
    { altiumFootprint: "SW4SMD_63X161LS", componentName: "SW1" },
    { altiumFootprint: "XTAL4_126-216SMD", componentName: "Y1" },
  ]) {
    const replacement = getCadModelReplacement(componentIdentity)
    expect(replacement?.kind).toBe("jscad")
    if (replacement?.kind !== "jscad") throw new Error("Expected a JSCAD replacement")
    expect(replacement.jscadOperations.length).toBeGreaterThan(1)
  }
})
