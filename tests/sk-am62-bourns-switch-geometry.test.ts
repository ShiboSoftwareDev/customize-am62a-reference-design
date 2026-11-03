import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { getMeshContactCenters } from "./fixtures/get-mesh-contact-centers"
import { isPointInsideMeshSection } from "./fixtures/is-point-inside-mesh-section"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import {
  findMissingPackageContacts,
  readPrebuiltPackageReview,
} from "./fixtures/read-prebuilt-package-review"

test("SK-AM62's Bourns 7914G switches have square cases, round buttons and four landed gull-wing leads", async () => {
  const review = await readPrebuiltPackageReview("sk-am62")
  const board = review.circuitJson.find((element) => element.type === "pcb_board")
  if (typeof board?.thickness !== "number") throw new Error("Missing board thickness")
  for (const componentName of ["SW3", "SW4"]) {
    const mesh = readGlbComponentMesh({ componentName, glb: review.glb })
    const dimensions = jscad.measurements.measureDimensions(mesh)
    expect(dimensions[0]).toBeCloseTo(5, 3)
    expect(dimensions[1]).toBeCloseTo(6.2, 3)
    expect(dimensions[2]).toBeCloseTo(4.19, 3)
    expect(getMeshContactCenters({ mesh, surfaceZ: board.thickness / 2 })).toHaveLength(4)
    expect(findMissingPackageContacts({ componentName, review })).toEqual([])
    const actuator = readGlbComponentMesh({
      componentName,
      glb: review.glb,
      materialColorFilter: (color) => Boolean(color && Math.max(...color.slice(0, 3)) < 0.1),
    })
    const actuatorBounds = jscad.measurements.measureBoundingBox(actuator)
    expect(actuatorBounds[1][2] - board.thickness / 2).toBeCloseTo(4.19, 3)
    const centerX = (actuatorBounds[0][0] + actuatorBounds[1][0]) / 2
    const centerY = (actuatorBounds[0][1] + actuatorBounds[1][1]) / 2
    expect(
      isPointInsideMeshSection({
        mesh: actuator,
        point: [centerX + 1, centerY, board.thickness / 2 + 3],
      }),
    ).toBe(true)
    expect(
      isPointInsideMeshSection({
        mesh: actuator,
        point: [centerX + 1, centerY + 1, board.thickness / 2 + 3],
      }),
    ).toBe(false)
  }
})
