import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import { readPrebuiltPackageReview } from "./fixtures/read-prebuilt-package-review"

test("dimensioned Sitara IC models include their contacts within the package height", async () => {
  for (const { boardId, packages } of [
    {
      boardId: "sk-am62",
      packages: [
        { componentName: "U48", heightMillimeters: 0.5 },
        { componentName: "U25", heightMillimeters: 0.4 },
        { componentName: "U4", heightMillimeters: 0.5 },
        { componentName: "U12", heightMillimeters: 0.7 },
        { componentName: "U46", heightMillimeters: 1.6 },
        { componentName: "U45", heightMillimeters: 1.2 },
      ],
    },
    {
      boardId: "tmds62levm",
      packages: [
        { componentName: "U2", heightMillimeters: 0.5 },
        { componentName: "U4", heightMillimeters: 0.5 },
        { componentName: "U28", heightMillimeters: 0.9 },
        { componentName: "U5", heightMillimeters: 1.6 },
        { componentName: "U14", heightMillimeters: 1.2 },
      ],
    },
  ]) {
    const review = await readPrebuiltPackageReview(boardId)
    for (const { componentName, heightMillimeters } of packages) {
      const dimensions = jscad.measurements.measureDimensions(
        readGlbComponentMesh({ componentName, glb: review.glb }),
      )
      expect(dimensions[2]).toBeCloseTo(heightMillimeters, 3)
    }
  }
})
