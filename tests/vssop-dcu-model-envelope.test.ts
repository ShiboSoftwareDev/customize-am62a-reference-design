import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import {
  readPrebuiltPackageReview,
  findMissingPackageContacts,
} from "./fixtures/read-prebuilt-package-review"

test("TI DCU VSSOP models use the 3.1 mm lead span and 0.9 mm seated envelope on both sides", async () => {
  for (const [boardId, componentName] of [
    ["sk-am62", "U82"],
    ["tmds62levm", "U130"],
  ]) {
    const review = await readPrebuiltPackageReview(boardId!)
    const dimensions = jscad.measurements.measureDimensions(
      readGlbComponentMesh({ componentName: componentName!, glb: review.glb }),
    )
    const planarDimensions = dimensions.slice(0, 2).sort((first, second) => first - second)
    expect(planarDimensions[0]).toBeCloseTo(2, 1)
    expect(planarDimensions[1]).toBeCloseTo(3.1, 1)
    expect(dimensions[2]).toBeLessThanOrEqual(0.9001)
    expect(findMissingPackageContacts({ componentName: componentName!, review })).toEqual([])
  }
})
