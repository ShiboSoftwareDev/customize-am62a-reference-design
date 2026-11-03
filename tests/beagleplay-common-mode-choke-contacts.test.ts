import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { getMeshContactCenters } from "./fixtures/get-mesh-contact-centers"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import {
  findMissingPackageContacts,
  readPrebuiltPackageReview,
} from "./fixtures/read-prebuilt-package-review"

test("BeaglePlay's L2012 common-mode chokes retain four isolated electrodes on either board side", async () => {
  const review = await readPrebuiltPackageReview("beagleplay")
  const board = review.circuitJson.find((element) => element.type === "pcb_board")
  if (typeof board?.thickness !== "number") throw new Error("Missing board thickness")
  for (const componentName of ["L4", "L13", "L15", "L20"]) {
    const source = review.circuitJson.find(
      (element) => element.type === "source_component" && element.name === componentName,
    )
    const component = review.circuitJson.find(
      (element) =>
        element.type === "pcb_component" &&
        element.source_component_id === source?.source_component_id,
    )
    const metal = readGlbComponentMesh({
      componentName,
      glb: review.glb,
      materialColorFilter: (color) => Boolean(color && Math.min(...color.slice(0, 3)) > 0.5),
    })
    const surfaceZ = ((component?.layer === "bottom" ? -1 : 1) * board.thickness) / 2
    const body = readGlbComponentMesh({ componentName, glb: review.glb })
    expect(jscad.measurements.measureDimensions(body)[2]).toBeCloseTo(1.4, 4)
    expect(getMeshContactCenters({ mesh: metal, surfaceZ })).toHaveLength(4)
    expect(findMissingPackageContacts({ componentName, review })).toEqual([])
  }
})
