import { expect, test } from "bun:test"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

test("uses 2.54 mm STEP contacts for TMDS62LEVM J11", () => {
  const replacement = getCadModelReplacement({
    altiumFootprint: "HDR_2X5_54202-T0805ALF_P_S_S_9-9",
    componentName: "J11",
  })

  expect(replacement?.kind).toBe("step")
  if (replacement?.kind !== "step") throw new Error("Expected a STEP replacement")
  expect(replacement.modelStepUrl).toEndWith("PinHeader_2x05_P2.54mm_Vertical_SMD.step")
})
