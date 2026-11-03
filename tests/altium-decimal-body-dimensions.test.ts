import { expect, test } from "bun:test"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

test("reads body dimensions encoded with Altium decimal separators", () => {
  for (const { componentName, altiumFootprint, bodySize } of [
    { componentName: "U3", altiumFootprint: "BGA153_P14_P5_11P5X13", bodySize: [11.5, 13, 1.2] },
    { componentName: "U2", altiumFootprint: "BGA96_T9_P8_10_3X13_3", bodySize: [10.3, 13.3, 1.2] },
  ]) {
    const replacement = getCadModelReplacement({ altiumFootprint, componentName })
    expect(replacement?.kind).toBe("jscad")
    if (replacement?.kind !== "jscad") throw new Error("Expected a JSCAD replacement")
    expect(replacement.jscadOperations[0]).toMatchObject({
      shape: { shape: { size: bodySize } },
    })
  }
})
