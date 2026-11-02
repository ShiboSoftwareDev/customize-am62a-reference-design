import { expect, test } from "bun:test"
import { createBgaCadModel } from "../scripts/prebuild-ti-evm-cad-scenes/create-integrated-circuit-cad-models"

test("places BGA balls on the board contact plane", () => {
  const operations = createBgaCadModel({
    bodyLength: 13,
    bodyWidth: 13,
    modelLocalPads: [
      { x: -1.125, y: 2.25, width: 0.3, height: 0.3, ccwRotationDegrees: 0 },
      { x: 0.875, y: -1.75, width: 0.3, height: 0.3, ccwRotationDegrees: 0 },
    ],
  })
  expect(operations[2]).toMatchObject({
    shape: {
      shape: {
        options: { height: 0.3 },
        type: "extrudeLinear",
      },
      type: "translate",
      vector: [-1.125, 2.25, 0],
    },
    type: "colorize",
  })
})
