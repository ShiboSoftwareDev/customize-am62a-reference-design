import { expect, test } from "bun:test"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

test("aligns the BeaglePlay USB-A shell with its board-edge footprint", () => {
  const replacement = getCadModelReplacement({
    altiumFootprint: "USB7P_1R4_14X5R72MM",
    componentName: "J13",
  })

  expect(replacement?.kind).toBe("jscad")
  if (replacement?.kind !== "jscad") throw new Error("Expected a JSCAD replacement")

  expect(replacement.modelYawOffsetDegrees ?? 0).toBe(0)
  expect(
    replacement.jscadOperations.every(
      (operation) =>
        operation.type === "translate" &&
        operation.vector[0] === 0 &&
        operation.vector[1] === -5.04 &&
        operation.vector[2] === 0,
    ),
  ).toBe(true)
})
