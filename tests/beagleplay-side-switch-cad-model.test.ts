import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { applyToPoint, rotateDEG } from "transformation-matrix"
import { isPointInsideMeshSection } from "./fixtures/is-point-inside-mesh-section"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import {
  findMissingPackageContacts,
  readPrebuiltPackageReview,
} from "./fixtures/read-prebuilt-package-review"

test("BeaglePlay TS23M buttons have side actuators and all five solder contacts", async () => {
  const review = await readPrebuiltPackageReview("beagleplay")
  for (const componentName of ["SW1", "SW2", "SW3"]) {
    const source = review.circuitJson.find(
      (element) => element.type === "source_component" && element.name === componentName,
    )
    const component = review.circuitJson.find(
      (element) =>
        element.type === "pcb_component" &&
        element.source_component_id === source?.source_component_id,
    )
    const board = review.circuitJson.find((element) => element.type === "pcb_board")
    if (
      typeof component?.footprint_origin !== "object" ||
      component.footprint_origin === null ||
      !("x" in component.footprint_origin) ||
      !("y" in component.footprint_origin) ||
      typeof component.footprint_origin.x !== "number" ||
      typeof component.footprint_origin.y !== "number" ||
      typeof component.rotation !== "number" ||
      typeof board?.thickness !== "number"
    )
      throw new Error(`Missing ${componentName} placement`)
    const mesh = readGlbComponentMesh({ componentName, glb: review.glb })
    const bounds = jscad.measurements.measureBoundingBox(mesh)
    const surfaceZ = board.thickness / 2
    expect(bounds[1][2] - surfaceZ).toBeCloseTo(1.85, 2)
    const actuator = readGlbComponentMesh({
      componentName,
      glb: review.glb,
      materialColorFilter: (color) => Boolean(color && Math.max(...color.slice(0, 3)) < 0.3),
    })
    const actuatorOffset = applyToPoint(rotateDEG(component.rotation), { x: 0, y: 1.85 })
    expect(
      isPointInsideMeshSection({
        mesh: actuator,
        point: [
          component.footprint_origin.x + actuatorOffset.x,
          component.footprint_origin.y + actuatorOffset.y,
          surfaceZ + 1,
        ],
      }),
    ).toBe(true)
    expect(
      isPointInsideMeshSection({
        mesh: actuator,
        point: [component.footprint_origin.x, component.footprint_origin.y, surfaceZ + 1.7],
      }),
    ).toBe(false)
    expect(findMissingPackageContacts({ componentName, review })).toEqual([])
  }
})
