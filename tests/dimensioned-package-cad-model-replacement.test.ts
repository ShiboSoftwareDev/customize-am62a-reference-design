import { expect, test } from "bun:test"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

test("replaces dimensioned QFP, BGA, and LGA source extrusions", () => {
  for (const [componentName, altiumFootprint] of [
    ["U14", "TQFP128_15-74_550X550_1-2"],
    ["U42", "VFBGA153_19-68_460X520_1-3"],
    ["U5", "E-13_4X13_3-N100_0_75-TOP"],
  ]) {
    const replacement = getCadModelReplacement({ altiumFootprint, componentName })
    expect(replacement?.kind).toBe("jscad")
    if (replacement?.kind !== "jscad") throw new Error("Expected a JSCAD replacement")
    expect(replacement.jscadOperations.length).toBeGreaterThan(4)
  }
})
