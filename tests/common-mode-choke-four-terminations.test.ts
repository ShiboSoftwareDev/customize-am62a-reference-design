import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import { getMeshContactCenters } from "./fixtures/get-mesh-contact-centers"
import {
  readPrebuiltPackageReview,
  findMissingPackageContacts,
} from "./fixtures/read-prebuilt-package-review"

test("DLW21 common-mode chokes have four isolated terminations instead of two shorting bars", async () => {
  for (const [boardId, names] of [
    ["sk-am62", ["L9", "L10"]],
    ["tmds62levm", ["L2", "L9"]],
  ] as const) {
    const review = await readPrebuiltPackageReview(boardId)
    for (const componentName of names) {
      const contacts = readGlbComponentMesh({
        componentName,
        glb: review.glb,
        materialColorFilter: (color) => Boolean(color && Math.min(...color.slice(0, 3)) > 0.5),
      })
      expect(getMeshContactCenters({ mesh: contacts, surfaceZ: 0.8 })).toHaveLength(4)
      expect(
        jscad.measurements.measureDimensions(
          readGlbComponentMesh({ componentName, glb: review.glb }),
        )[2],
      ).toBeCloseTo(1.2, 4)
      expect(findMissingPackageContacts({ componentName, review })).toEqual([])
    }
  }
})
