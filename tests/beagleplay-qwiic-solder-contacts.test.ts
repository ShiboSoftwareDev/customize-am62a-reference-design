import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import {
  readPrebuiltPackageReview,
  findMissingPackageContacts,
} from "./fixtures/read-prebuilt-package-review"

test("BeaglePlay J18 has four landed signal tails and two mounting tabs", async () => {
  const review = await readPrebuiltPackageReview("beagleplay")
  const source = review.circuitJson.find(
    (element) => element.type === "source_component" && element.name === "J18",
  )
  const component = review.circuitJson.find(
    (element) =>
      element.type === "pcb_component" &&
      element.source_component_id === source?.source_component_id,
  )
  const pads = review.circuitJson.filter(
    (element) =>
      element.type === "pcb_smtpad" && element.pcb_component_id === component?.pcb_component_id,
  )
  expect(pads).toHaveLength(6)
  // Filter the STEP's contact material, excluding the cream housing. Inspect
  // solder-height triangles directly; tessellated STEP shells can mix winding.
  expect(
    findMissingPackageContacts({
      componentName: "J18",
      review,
      materialColorFilter: (color) => Boolean(color && color[0]! > 0.6 && color[0]! < 0.7),
    }),
  ).toEqual([])
  expect(
    jscad.measurements.measureDimensions(
      readGlbComponentMesh({ componentName: "J18", glb: review.glb }),
    )[2],
  ).toBeLessThanOrEqual(3.1001)
})
