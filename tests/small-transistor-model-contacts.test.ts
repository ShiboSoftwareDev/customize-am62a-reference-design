import { expect, test } from "bun:test"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import {
  findMissingPackageContacts,
  readPrebuiltPackageReview,
} from "./fixtures/read-prebuilt-package-review"

test("Sitara SOT323 SOT523 and SMINI6 models meet every land on both board sides", async () => {
  for (const { boardId, componentNames } of [
    {
      boardId: "beagleplay",
      componentNames: ["Q3", "Q4", "Q6", "Q7", "Q8", "Q9", "Q10", "Q12", "Q13", "Q14"],
    },
    { boardId: "beaglebone-black", componentNames: ["Q1", "Q2"] },
  ]) {
    const review = await readPrebuiltPackageReview(boardId)
    for (const componentName of componentNames) {
      expect(
        readGlbComponentMesh({
          componentName,
          glb: review.glb,
          materialColorFilter: (color) => Boolean(color && Math.max(...color.slice(0, 3)) < 0.25),
        }).polygons.length,
      ).toBeGreaterThan(0)
      expect(findMissingPackageContacts({ componentName, review })).toEqual([])
    }
  }
})
