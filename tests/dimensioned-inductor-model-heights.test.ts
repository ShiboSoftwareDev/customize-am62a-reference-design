import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import {
  findMissingPackageContacts,
  readPrebuiltPackageReview,
} from "./fixtures/read-prebuilt-package-review"

test("dimensioned Sitara inductors use the authored seated height instead of a width ratio", async () => {
  for (const { boardId, packages } of [
    {
      boardId: "tmds62levm",
      packages: [
        { name: "L11", height: 7 },
        { name: "L10", height: 2.1 },
        { name: "L1", height: 1.2 },
        { name: "L2", height: 1.4 },
      ],
    },
    {
      boardId: "sk-am62",
      packages: [
        { name: "L12", height: 6.1 },
        { name: "L13", height: 2.1 },
        { name: "L14", height: 1.2 },
        { name: "L8", height: 1.5 },
        { name: "L7", height: 1.2 },
      ],
    },
  ]) {
    const review = await readPrebuiltPackageReview(boardId)
    for (const { name, height } of packages) {
      const mesh = readGlbComponentMesh({ componentName: name, glb: review.glb })
      expect(jscad.measurements.measureDimensions(mesh)[2], `${boardId} ${name}`).toBeCloseTo(
        height,
        4,
      )
      expect(
        findMissingPackageContacts({ componentName: name, review }),
        `${boardId} ${name}`,
      ).toEqual([])
    }
  }
})
