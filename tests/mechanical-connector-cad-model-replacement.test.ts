import { expect, test } from "bun:test"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

test("replaces recognizable Sitara board connectors with detailed models", () => {
  for (const componentIdentity of [
    { altiumFootprint: "3020-14-0200-00", componentName: "J18" },
    { altiumFootprint: "5019512230", componentName: "J23" },
    { altiumFootprint: "FPC40_0D5_25_4X5_25X2MM", componentName: "J19" },
    { altiumFootprint: "JST4P_1D0_RIGHT", componentName: "J7" },
    { altiumFootprint: "RJ45-7499010211A", componentName: "J1" },
    { altiumFootprint: "USB2_0_TYPE_C", componentName: "J2" },
  ]) {
    const replacement = getCadModelReplacement(componentIdentity)
    expect(replacement?.kind).toBe("jscad")
    if (replacement?.kind !== "jscad") throw new Error("Expected a JSCAD replacement")
    expect(replacement.jscadOperations.length).toBeGreaterThan(4)
  }
})
