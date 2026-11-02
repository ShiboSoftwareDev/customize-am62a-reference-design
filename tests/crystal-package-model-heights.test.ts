import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import { readPrebuiltPackageReview } from "./fixtures/read-prebuilt-package-review"
import { getDnpComponentNames } from "../scripts/prebuild-ti-evm-cad-scenes/get-dnp-component-names"

test("crystal package heights include the substrate and match the reference footprint", async () => {
  for (const { boardId, packages } of [
    {
      boardId: "tmds62levm",
      packages: [
        { name: "Y1", height: 1.4 },
        { name: "Y3", height: 0.7 },
      ],
    },
    {
      boardId: "sk-am62",
      packages: [
        { name: "Y3", height: 0.9 },
        { name: "U59", height: 0.8 },
      ],
    },
    {
      boardId: "beagleplay",
      packages: [
        { name: "X6", height: 1 },
        { name: "X2", height: 1 },
      ],
    },
  ] as const) {
    const review = await readPrebuiltPackageReview(boardId)
    for (const { name, height } of packages) {
      if (getDnpComponentNames(boardId).has(name)) {
        expect(() => readGlbComponentMesh({ componentName: name, glb: review.glb })).toThrow(
          `Missing ${name} mesh`,
        )
        continue
      }
      const mesh = readGlbComponentMesh({ componentName: name, glb: review.glb })
      expect(jscad.measurements.measureDimensions(mesh)[2], `${boardId} ${name}`).toBeCloseTo(
        height,
        4,
      )
    }
  }
})
