import { expect, test } from "bun:test"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

type AltiumFootprintName = string
type ModelYawOffsetDegrees = number

test("aligns board-edge connector openings with their Sitara footprints", () => {
  const expectedYawOffsetByFootprint = new Map<AltiumFootprintName, ModelYawOffsetDegrees>([
    ["USB7P_1R4_14X5R72MM", -90],
    ["USB2_0_TYPE_C", -90],
    ["MICRO_SD_ST_TF_003A_16_1X14_5MM", 90],
    ["JST4P_SMD_2_0_90D", 180],
    ["USB5MINI_4SHIELDED_SMD-5", -90],
    ["SD-MICRO-SCHA5B0300", 0],
    ["CONN3-PWR-PJ102A", 90],
  ])

  for (const [altiumFootprint, expectedYawOffsetDegrees] of expectedYawOffsetByFootprint) {
    const replacement = getCadModelReplacement({
      altiumFootprint,
      componentName: "J1",
    })
    expect(replacement?.kind).toBe("jscad")
    if (replacement?.kind !== "jscad") throw new Error("Expected a JSCAD replacement")
    expect(replacement.modelYawOffsetDegrees ?? 0).toBe(expectedYawOffsetDegrees)
  }
})
