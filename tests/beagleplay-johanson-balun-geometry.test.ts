import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { getMeshContactCenters } from "./fixtures/get-mesh-contact-centers"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import {
  findMissingPackageContacts,
  readPrebuiltPackageReview,
} from "./fixtures/read-prebuilt-package-review"

test("BeaglePlay B1 uses the Johanson 2 x 1.25 mm ceramic balun with ten perimeter terminals", async () => {
  const review = await readPrebuiltPackageReview("beagleplay")
  const mesh = readGlbComponentMesh({ componentName: "B1", glb: review.glb })
  const dimensions = jscad.measurements.measureDimensions(mesh)
  expect(dimensions[0]).toBeCloseTo(2, 4)
  expect(dimensions[1]).toBeCloseTo(1.25, 4)
  expect(dimensions[2]).toBeCloseTo(1, 4)
  const board = review.circuitJson.find((element) => element.type === "pcb_board")
  if (typeof board?.thickness !== "number") throw new Error("Missing board thickness")
  const metal = readGlbComponentMesh({
    componentName: "B1",
    glb: review.glb,
    materialColorFilter: (color) => Boolean(color && Math.min(...color.slice(0, 3)) > 0.5),
  })
  expect(getMeshContactCenters({ mesh: metal, surfaceZ: -board.thickness / 2 })).toHaveLength(10)
  expect(findMissingPackageContacts({ componentName: "B1", review })).toEqual([])
})
