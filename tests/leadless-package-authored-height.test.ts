import { expect, test } from "bun:test"
import { getDnpComponentNames } from "../scripts/prebuild-ti-evm-cad-scenes/get-dnp-component-names"
import jscad from "@jscad/modeling"
import { getPackageHeightMillimeters } from "../scripts/prebuild-ti-evm-cad-scenes/get-package-height-millimeters"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import {
  readPrebuiltPackageReview,
  findMissingPackageContacts,
} from "./fixtures/read-prebuilt-package-review"

test("multi-terminal Sitara leadless packages retain authored heights and landed terminals", async () => {
  let checkedCount = 0
  for (const boardId of ["tmds62levm", "sk-am62", "beagleplay"] as const) {
    const review = await readPrebuiltPackageReview(boardId)
    for (const source of review.circuitJson) {
      if (source.type !== "source_component" || typeof source.name !== "string") continue
      if (getDnpComponentNames(boardId).has(source.name)) continue
      const footprint = review.footprints[source.name]
      if (
        !/^(?:U?QFN|VQFN(?:HR)?|WQFN|X[12]SON|U?SON|UDFN|WSON|VSON(?:HR)?)\d+/u.test(
          footprint ?? "",
        )
      )
        continue
      if (/^X1SON2_/u.test(footprint)) continue
      const height = getPackageHeightMillimeters(footprint)
      if (!height) continue
      const mesh = readGlbComponentMesh({ componentName: source.name, glb: review.glb })
      expect(
        jscad.measurements.measureDimensions(mesh)[2],
        `${boardId} ${source.name} ${footprint}`,
      ).toBeCloseTo(height, 4)
      expect(
        findMissingPackageContacts({ componentName: source.name, review }),
        `${boardId} ${source.name}`,
      ).toEqual([])
      checkedCount++
    }
  }
  expect(checkedCount).toBeGreaterThan(80)
})
