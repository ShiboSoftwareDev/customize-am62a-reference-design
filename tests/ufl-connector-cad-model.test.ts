import { expect, test } from "bun:test"
import { createUflConnectorCadModel } from "../scripts/prebuild-ti-evm-cad-scenes/create-board-connector-cad-models"

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
