import { expect, test } from "bun:test"
import type { Vec3 } from "@jscad/modeling/src/maths/types"
import { isPointInsideMeshSection } from "./fixtures/is-point-inside-mesh-section"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import { readPrebuiltPackageReview } from "./fixtures/read-prebuilt-package-review"

test("registered USB housings leave the neighboring fitted components unobstructed", async () => {
  // Board-XYZ points inside the neighbors where the old generic housings intersected them.
  const cases: Array<{
    boardId: string
    connectorName: string
    neighborName: string
    pointInsideNeighbor: Vec3
  }> = [
    {
      boardId: "tmds62levm",
      connectorName: "J15",
      neighborName: "U46",
      pointInsideNeighbor: [116.36237, 45.600273, 1.145344],
    },
    {
      boardId: "tmds62levm",
      connectorName: "J8",
      neighborName: "D2",
      pointInsideNeighbor: [7.685905, 99.027933, 0.870149],
    },
    {
      boardId: "sk-am62",
      connectorName: "J15",
      neighborName: "U44",
      pointInsideNeighbor: [3.998139, 7.109658, 0.982115],
    },
    {
      boardId: "sk-am62",
      connectorName: "J16",
      neighborName: "D8",
      pointInsideNeighbor: [72.969493, 4.889775, 0.870149],
    },
  ]
  for (const { boardId, connectorName, neighborName, pointInsideNeighbor } of cases) {
    const { glb } = await readPrebuiltPackageReview(boardId)
    const neighbor = readGlbComponentMesh({ componentName: neighborName, glb })
    const connector = readGlbComponentMesh({ componentName: connectorName, glb })
    expect(isPointInsideMeshSection({ mesh: neighbor, point: pointInsideNeighbor })).toBe(true)
    expect(isPointInsideMeshSection({ mesh: connector, point: pointInsideNeighbor })).toBe(false)
  }
})
