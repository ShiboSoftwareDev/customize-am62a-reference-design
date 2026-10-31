import { expect, test } from "bun:test"
import { createBgaCadModel } from "../scripts/prebuild-ti-evm-cad-scenes/create-integrated-circuit-cad-models"

test("places BGA balls on the board contact plane", () => {
  const operations = createBgaCadModel({
    bodyLength: 13,
    bodyWidth: 13,
    pinCount: 425,
  })
  expect(operations[2]).toMatchObject({
    shape: {
      shape: {
        options: { height: 0.56 },
        type: "extrudeLinear",
      },
      type: "translate",
      vector: [-5.33, -5.33, 0],
    },
    type: "colorize",
  })
})
