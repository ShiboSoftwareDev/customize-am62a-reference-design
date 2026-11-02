import { expect, test } from "bun:test"
import { getDnpComponentNames } from "../scripts/prebuild-ti-evm-cad-scenes/get-dnp-component-names"
import jscad from "@jscad/modeling"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import {
  readPrebuiltPackageReview,
  findMissingPackageContacts,
} from "./fixtures/read-prebuilt-package-review"

test("Wurth LD indicators use light LED lenses instead of ferrite inductor cases", async () => {
  let checkedCount = 0
  for (const boardId of ["tmds62levm", "sk-am62"] as const) {
    const review = await readPrebuiltPackageReview(boardId)
    for (const source of review.circuitJson) {
      if (source.type !== "source_component" || typeof source.name !== "string") continue
      if (getDnpComponentNames(boardId).has(source.name)) continue
      const footprint = review.footprints[source.name]
      if (!/^LED_1500(?:40|80)/u.test(footprint ?? "")) continue
      const is0402 = footprint.startsWith("LED_150040")
      const dimensions = jscad.measurements.measureDimensions(
        readGlbComponentMesh({ componentName: source.name, glb: review.glb }),
      )
      expect(dimensions[2], `${boardId} ${source.name}`).toBeCloseTo(is0402 ? 0.46 : 0.7, 4)
      const lens = readGlbComponentMesh({
        componentName: source.name,
        glb: review.glb,
        materialColorFilter: (color) => Boolean(color && Math.min(...color.slice(0, 3)) > 0.8),
      })
      expect(lens.polygons.length, `${boardId} ${source.name} lens`).toBeGreaterThan(0)
      expect(findMissingPackageContacts({ componentName: source.name, review })).toEqual([])
      checkedCount++
    }
  }
  expect(checkedCount).toBe(28)
  const beaglePlayReview = await readPrebuiltPackageReview("beagleplay")
  let beaglePlayIndicatorCount = 0
  for (const source of beaglePlayReview.circuitJson) {
    if (
      source.type !== "source_component" ||
      typeof source.name !== "string" ||
      !/^LED\d/u.test(source.name)
    )
      continue
    if (getDnpComponentNames("beagleplay").has(source.name)) continue
    const lens = readGlbComponentMesh({
      componentName: source.name,
      glb: beaglePlayReview.glb,
      materialColorFilter: (color) => Boolean(color && Math.min(...color.slice(0, 3)) > 0.8),
    })
    expect(lens.polygons.length, source.name).toBeGreaterThan(0)
    expect(
      findMissingPackageContacts({ componentName: source.name, review: beaglePlayReview }),
    ).toEqual([])
    beaglePlayIndicatorCount++
  }
  expect(beaglePlayIndicatorCount).toBe(11)
})
