import { expect, test } from "bun:test"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

test("uses board-specific geometry for surface-mount and mikroBUS headers", () => {
  for (const [componentName, altiumFootprint] of [
    ["J14", "HDR_5X3_TSM-105-01-T-TM_S_S_9-9"],
    ["J21", "MIKROBUS16_2D54_25_4X22_88X8_5MM"],
  ]) {
    const replacement = getCadModelReplacement({ altiumFootprint, componentName })
    expect(replacement?.kind).toBe("jscad")
    if (replacement?.kind !== "jscad") throw new Error("Expected a JSCAD replacement")
    expect(replacement.jscadOperations.length).toBeGreaterThan(4)
  }
})
