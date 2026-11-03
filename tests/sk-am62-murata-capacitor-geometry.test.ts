import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import {
  findMissingPackageContacts,
  readPrebuiltPackageReview,
} from "./fixtures/read-prebuilt-package-review"

test("SK-AM62 C1 uses the fitted GJM1555C1H2R4BB01D's 1 x 0.5 x 0.5 mm envelope", async () => {
  const review = await readPrebuiltPackageReview("sk-am62")
  const source = review.circuitJson.find(
    (element) => element.type === "source_component" && element.name === "C1",
  )
  expect(source?.manufacturer_part_number).toBe("GJM1555C1H2R4BB01D")
  const mesh = readGlbComponentMesh({ componentName: "C1", glb: review.glb })
  const dimensions = jscad.measurements.measureDimensions(mesh)
  expect(dimensions[0]).toBeCloseTo(1, 4)
  expect(dimensions[1]).toBeCloseTo(0.5, 4)
  expect(dimensions[2]).toBeCloseTo(0.5, 4)
  expect(findMissingPackageContacts({ componentName: "C1", review })).toEqual([])
})
