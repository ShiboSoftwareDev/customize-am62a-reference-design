import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { readPrebuiltPackageReview } from "./fixtures/read-prebuilt-package-review"
import { readGlbGoldContactMesh } from "./fixtures/read-glb-gold-contact-mesh"
import { isPointInsideMeshSection } from "./fixtures/is-point-inside-mesh-section"

test("BeaglePlay J21 has 16 surface-mount tails above the board", async () => {
  const { circuitJson, glb } = await readPrebuiltPackageReview("beagleplay")
  const source = circuitJson.find((el) => el.type === "source_component" && el.name === "J21")
  const component = circuitJson.find(
    (el) => el.type === "pcb_component" && el.source_component_id === source?.source_component_id,
  )
  const board = circuitJson.find((el) => el.type === "pcb_board")
  if (!component || typeof board?.thickness !== "number") throw new Error("Missing J21 footprint")
  const pads = circuitJson.filter(
    (el) => el.type === "pcb_smtpad" && el.pcb_component_id === component.pcb_component_id,
  )
  const mesh = readGlbGoldContactMesh({ componentName: "J21", glb })
  const surfaceZ = board.thickness / 2
  expect(pads).toHaveLength(16)
  expect(jscad.measurements.measureBoundingBox(mesh)[0][2]).toBeCloseTo(surfaceZ, 5)
  for (const { x, y } of pads) {
    if (typeof x !== "number" || typeof y !== "number") throw new Error("Missing J21 land center")
    expect(isPointInsideMeshSection({ mesh, point: [x, y, surfaceZ + 0.05] })).toBe(true)
  }
})
