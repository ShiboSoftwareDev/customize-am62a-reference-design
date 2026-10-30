import { expect, test } from "bun:test"
import { isPointInsidePolygon } from "@tscircuit/math-utils"
import { subtractCopperKeepouts } from "../scripts/ti-evm-reference-generator/copper-keepout-geometry"

test("overlapping copper keepouts remain excluded when combined", () => {
  const polygons = subtractCopperKeepouts({
    polygon: [
      [
        [0, 0],
        [10, 0],
        [10, 10],
        [0, 10],
      ],
    ],
    keepouts: [
      [
        [
          [2, 2],
          [6, 2],
          [6, 6],
          [2, 6],
        ],
      ],
      [
        [
          [4, 4],
          [8, 4],
          [8, 8],
          [4, 8],
        ],
      ],
    ],
  })
  const rings = polygons.flat().map((ring) => ring.map(([x, y]) => ({ x, y })))
  for (const point of [
    { x: 3, y: 3 },
    { x: 5, y: 5 },
    { x: 7, y: 7 },
  ]) {
    expect(rings.filter((ring) => isPointInsidePolygon(point, ring)).length % 2).toBe(0)
  }
  expect(rings.filter((ring) => isPointInsidePolygon({ x: 1, y: 1 }, ring)).length % 2).toBe(1)
})
