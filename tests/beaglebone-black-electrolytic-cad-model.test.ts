import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import {
  findMissingPackageContacts,
  readPrebuiltPackageReview,
} from "./fixtures/read-prebuilt-package-review"

test("BeagleBone Black C34 retains its 6.3 mm can, SMD base and both terminals", async () => {
  const review = await readPrebuiltPackageReview("beaglebone-black")
  const board = review.circuitJson.find((element) => element.type === "pcb_board")
  if (typeof board?.thickness !== "number") throw new Error("Missing board thickness")
  const surfaceZ = board.thickness / 2
  const mesh = readGlbComponentMesh({ componentName: "C34", glb: review.glb })
  const canMesh = readGlbComponentMesh({
    componentName: "C34",
    glb: review.glb,
    materialColorFilter: (color) => Boolean(color && Math.min(...color.slice(0, 3)) > 0.4),
  })
  const canVertices = canMesh.polygons.flatMap((polygon) =>
    polygon.vertices.filter((vertex) => vertex[2] > surfaceZ + 1),
  )
  expect(canVertices.length).toBeGreaterThan(0)
  for (const axis of [0, 1] as const) {
    const coordinates = canVertices.map((vertex) => vertex[axis])
    expect(Math.max(...coordinates) - Math.min(...coordinates)).toBeCloseTo(6.3, 2)
  }
  const bounds = jscad.measurements.measureBoundingBox(mesh)
  expect(bounds[1][2] - surfaceZ).toBeCloseTo(5.3, 2)
  const baseMesh = readGlbComponentMesh({
    componentName: "C34",
    glb: review.glb,
    materialColorFilter: (color) => Boolean(color && Math.max(...color.slice(0, 3)) < 0.2),
  })
  const baseVertices = baseMesh.polygons.flatMap((polygon) =>
    polygon.vertices.filter((vertex) => vertex[2] > surfaceZ + 0.1 && vertex[2] < surfaceZ + 0.5),
  )
  expect(baseVertices.length).toBeGreaterThan(0)
  for (const axis of [0, 1] as const) {
    const coordinates = baseVertices.map((vertex) => vertex[axis])
    expect(Math.max(...coordinates) - Math.min(...coordinates)).toBeCloseTo(6.6, 2)
  }
  expect(findMissingPackageContacts({ componentName: "C34", review })).toEqual([])
})
