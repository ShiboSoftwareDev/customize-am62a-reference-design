import { expect, test } from "bun:test"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

test("does not read an Altium footprint revision as a decimal dimension", () => {
  const replacement = getCadModelReplacement({
    altiumFootprint: "BGA24_39-37_240X310_1",
    componentName: "U34",
  })
  expect(replacement?.kind).toBe("jscad")
  if (replacement?.kind !== "jscad") throw new Error("Expected a JSCAD replacement")

  const bodyOperation = replacement.jscadOperations[0]
  expect(bodyOperation).toMatchObject({
    type: "colorize",
    shape: {
      type: "translate",
      shape: { size: [6.1, 7.87, 1.2] },
    },
  })
})
