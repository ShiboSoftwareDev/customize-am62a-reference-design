import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import {
  findMissingPackageContacts,
  readPrebuiltPackageReview,
} from "./fixtures/read-prebuilt-package-review"

test("W3006 antennas have the manufacturer dimensions and meet both source lands", async () => {
  const review = await readPrebuiltPackageReview("sk-am62")
  for (const componentName of ["A1", "A2"]) {
    const dimensions = jscad.measurements.measureDimensions(
      readGlbComponentMesh({ componentName, glb: review.glb }),
    )
    expect(dimensions.slice(0, 2).sort((first, second) => first - second)[0]).toBeCloseTo(3.2, 3)
    expect(dimensions.slice(0, 2).sort((first, second) => first - second)[1]).toBeCloseTo(10, 3)
    expect(dimensions[2]).toBeCloseTo(1.5, 3)
    expect(findMissingPackageContacts({ componentName, review })).toEqual([])
  }
})
