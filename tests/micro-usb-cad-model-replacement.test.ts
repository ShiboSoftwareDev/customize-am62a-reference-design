import { expect, test } from "bun:test"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

test("creates detailed connector geometry only for recognized source parts", () => {
  const replacement = getCadModelReplacement({
    altiumFootprint: "CON_MUSBB5_629105150521_S_R_S_2-7",
    componentName: "J7",
    manufacturerPartNumber: "629105150521",
  })

  expect(replacement?.kind).toBe("jscad")
  if (replacement?.kind !== "jscad") throw new Error("Expected a JSCAD replacement")
  expect(replacement.jscadOperations.length).toBeGreaterThan(4)
  expect(replacement.jscadOperations.some((operation) => operation.type === "colorize")).toBe(true)
})
