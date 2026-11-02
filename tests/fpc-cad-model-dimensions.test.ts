import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"
import { executeCadModelOperation } from "./fixtures/execute-cad-model-operation"

test("FPC families keep their reference body dimensions and insertion orientation", () => {
  for (const { altiumFootprint, dimensions } of [
    { altiumFootprint: "CON_FLEX1X15_1-1734248-5_S_S_S_7-7", dimensions: [22.4, 4.6, 7.7] },
    { altiumFootprint: "CON_FLEX1X40_FFC2A32-40-T", dimensions: [27.4, 3.3, 4.25] },
    { altiumFootprint: "CON_FLEX2X11_5019512230", dimensions: [13.4, 4.5, 4.05] },
    { altiumFootprint: "CON_FLEX40X1_FH12A_S_R_S_0-2", dimensions: [24.5, 7, 2] },
    { altiumFootprint: "FPC40_0D5_25_4X5_25X2MM", dimensions: [25.4, 5.25, 2] },
    { altiumFootprint: "FPC22_0D5_15_4X5_25X2MM_0D5_DX_N", dimensions: [15.4, 5.25, 2] },
  ]) {
    const replacement = getCadModelReplacement({ altiumFootprint, componentName: "J1" })
    if (replacement?.kind !== "jscad") throw new Error("Expected dimensioned FPC model")
    const bounds = jscad.measurements.measureAggregateBoundingBox(
      replacement.jscadOperations.map(executeCadModelOperation),
    )
    for (const axis of [0, 1] as const)
      expect(bounds[1][axis] - bounds[0][axis], altiumFootprint).toBeCloseTo(dimensions[axis]!, 3)
    expect(bounds[1][2], altiumFootprint).toBeCloseTo(dimensions[2]!, 3)
  }
})
