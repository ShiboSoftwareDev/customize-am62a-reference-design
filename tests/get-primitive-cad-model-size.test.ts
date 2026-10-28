import { expect, test } from "bun:test"
import { getPrimitiveCadModelSize } from "../scripts/prebuild-ti-evm-cad-scenes/get-primitive-cad-model-size"

test("reads the bounds of an imported Altium primitive body", () => {
  expect(
    getPrimitiveCadModelSize({
      type: "colorize",
      color: [0.5, 0.5, 0.5],
      shape: {
        type: "extrudeLinear",
        options: { height: -3.81 },
        shape: {
          type: "fromPointsGeom2",
          points: [
            [4, 3],
            [-4, 3],
            [-4, -3],
            [4, -3],
          ],
        },
      },
    }),
  ).toEqual({ x: 8, y: 6, z: 3.81 })
})

test("ignores unsupported JSCAD operations", () => {
  expect(getPrimitiveCadModelSize({ type: "cuboid", size: [8, 6, 3] })).toBeUndefined()
})
