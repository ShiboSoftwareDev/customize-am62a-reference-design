import { expect, test } from "bun:test"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

test("uses the manufacturer micro-USB model with a numbered land datum", () => {
  const replacement = getCadModelReplacement({
    altiumFootprint: "CON_MUSBB5_629105150521_S_R_S_2-7",
    componentName: "J7",
    manufacturerPartNumber: "629105150521",
  })

  expect(replacement?.kind).toBe("step")
  if (replacement?.kind !== "step") throw new Error("Expected a STEP replacement")
  expect(replacement.modelStepUrl).toContain("WurthElektronik/KiCad-Library/")
  expect(replacement.modelPinPositions).toHaveLength(5)
  expect(replacement.modelOriginPosition).toEqual({ x: 0, y: 0, z: 0 })
})
