import { expect, test } from "bun:test"
import { createUflConnectorCadModel } from "../scripts/prebuild-ti-evm-cad-scenes/create-board-connector-cad-models"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

test("models the Sitara U.FL receptacles with a hollow metal shell", () => {
  const operations = createUflConnectorCadModel()

  expect(operations).toHaveLength(6)
  expect(operations[0]).toMatchObject({
    color: [0.74, 0.77, 0.8],
    shape: {
      shape: { size: [2.6, 2.6, 0.32], type: "roundedCuboid" },
      type: "translate",
      vector: [0, 0, 0.16],
    },
    type: "colorize",
  })
  expect(operations[3]).toMatchObject({
    color: [0.74, 0.77, 0.8],
    shape: {
      shape: {
        shapes: [
          { height: 0.85, radius: 1, type: "cylinder" },
          { height: 0.95, radius: 0.64, type: "cylinder" },
        ],
        type: "subtract",
      },
      type: "translate",
      vector: [0, 0, 0.775],
    },
    type: "colorize",
  })
})

test("uses the detailed U.FL model for both Sitara source footprints", () => {
  for (const componentIdentity of [
    {
      altiumFootprint: "CON_JACK3_U-FL-R-SMT_P_S_S_1-3",
      componentName: "J1",
      manufacturerPartNumber: "U.FL-R-SMT-1(01)",
    },
    {
      altiumFootprint: "U-FL3P-SMD-2_6X2_6X1_0MM",
      componentName: "J3",
    },
  ]) {
    const replacement = getCadModelReplacement(componentIdentity)
    expect(replacement?.kind).toBe("jscad")
    if (replacement?.kind !== "jscad") throw new Error("Expected a JSCAD replacement")
    expect(replacement.jscadOperations).toEqual(createUflConnectorCadModel())
  }
})
