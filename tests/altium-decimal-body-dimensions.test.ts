import { expect, test } from "bun:test"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

test("reads body dimensions encoded with Altium decimal separators", () => {
  for (const [componentName, altiumFootprint] of [
    ["U3", "BGA153_P14_P5_11P5X13"],
    ["U2", "BGA96_T9_P8_10_3X13_3"],
  ]) {
    const replacement = getCadModelReplacement({ altiumFootprint, componentName })
    expect(replacement?.kind).toBe("jscad")
    if (replacement?.kind !== "jscad") throw new Error("Expected a JSCAD replacement")
    expect(replacement.jscadOperations.length).toBeGreaterThan(90)
  }
})
