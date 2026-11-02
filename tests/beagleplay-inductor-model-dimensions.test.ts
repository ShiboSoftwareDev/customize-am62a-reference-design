import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import {
  findMissingPackageContacts,
  readPrebuiltPackageReview,
} from "./fixtures/read-prebuilt-package-review"

test("BeaglePlay CSTB252012H inductors have their 2.5 by 2 mm package and meet both lands", async () => {
  const review = await readPrebuiltPackageReview("beagleplay")
  for (const componentName of ["L14", "L16", "L17", "L18"]) {
    const mesh = readGlbComponentMesh({ componentName, glb: review.glb })
    const dimensions = jscad.measurements.measureDimensions(mesh)
    const planarDimensions = dimensions.slice(0, 2).sort((first, second) => first - second)
    expect(planarDimensions[0]).toBeCloseTo(2, 3)
    expect(planarDimensions[1]).toBeCloseTo(2.5, 3)
    expect(dimensions[2]).toBeCloseTo(1.2, 3)
    expect(findMissingPackageContacts({ componentName, review })).toEqual([])
  }
})
