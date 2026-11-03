import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { isPointInsideMeshSection } from "./fixtures/is-point-inside-mesh-section"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import {
  findMissingPackageContacts,
  readPrebuiltPackageReview,
} from "./fixtures/read-prebuilt-package-review"

test("TMDS62LEVM's fitted UT107 capacitors have an 8 mm can and 10.2 mm seated envelope", async () => {
  const review = await readPrebuiltPackageReview("tmds62levm")
  for (const componentName of ["C146", "C147"]) {
    const mesh = readGlbComponentMesh({ componentName, glb: review.glb })
    const bounds = jscad.measurements.measureBoundingBox(mesh)
    const centerX = (bounds[0][0] + bounds[1][0]) / 2
    const centerY = (bounds[0][1] + bounds[1][1]) / 2
    // The drawing allows 10.2 -0.2/+0.8 mm mounting height.
    expect(bounds[1][2] - bounds[0][2]).toBeGreaterThanOrEqual(10)
    expect(bounds[1][2] - bounds[0][2]).toBeLessThanOrEqual(11)
    const canVertices = mesh.polygons.flatMap((polygon) =>
      polygon.vertices.filter((vertex) => vertex[2] > bounds[0][2] + 1),
    )
    for (const axis of [0, 1] as const) {
      const coordinates = canVertices.map((vertex) => vertex[axis])
      expect(Math.max(...coordinates) - Math.min(...coordinates)).toBeCloseTo(8, 3)
    }
    expect(
      isPointInsideMeshSection({ mesh, point: [centerX + 3, centerY, bounds[0][2] + 5] }),
    ).toBe(true)
    expect(
      isPointInsideMeshSection({ mesh, point: [centerX + 3.8, centerY + 3.8, bounds[0][2] + 5] }),
    ).toBe(false)
    expect(findMissingPackageContacts({ componentName, review })).toEqual([])
  }
})
