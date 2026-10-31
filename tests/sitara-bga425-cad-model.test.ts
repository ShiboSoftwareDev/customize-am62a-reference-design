import { expect, test } from "bun:test"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

test("uses a bounded dimensioned model for the Sitara BGA425 package", () => {
  for (const altiumFootprint of ["BGA425_0D5_13X13MM", "BGA425_19-68_510X510_0-7"]) {
    const replacement = getCadModelReplacement({ altiumFootprint, componentName: "U1" })
    expect(replacement?.kind).toBe("jscad")
    if (replacement?.kind !== "jscad") throw new Error("Expected a JSCAD replacement")
    expect(replacement.jscadOperations).toHaveLength(427)
  }
})
