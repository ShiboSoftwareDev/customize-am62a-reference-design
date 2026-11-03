import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { readPrebuiltPackageReview } from "./fixtures/read-prebuilt-package-review"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import { isPointInsideMeshSection } from "./fixtures/is-point-inside-mesh-section"

test("TMDS62LEVM POT1 has a slotted adjustment screw and three SMT terminals", async () => {
  const { circuitJson, glb } = await readPrebuiltPackageReview("tmds62levm")
  const source = circuitJson.find((el) => el.type === "source_component" && el.name === "POT1")
  const component = circuitJson.find(
    (el) => el.type === "pcb_component" && el.source_component_id === source?.source_component_id,
  )
  const board = circuitJson.find((el) => el.type === "pcb_board")
  if (!component || typeof board?.thickness !== "number") throw new Error("Missing POT1 footprint")
  const pads = circuitJson.filter(
    (el) => el.type === "pcb_smtpad" && el.pcb_component_id === component.pcb_component_id,
  )
  const screw = readGlbComponentMesh({
    componentName: "POT1",
    glb,
    materialColorFilter: (color) => Boolean(color && Math.abs(color[0]! - 0.74) < 1e-6),
  })
  const [min, max] = jscad.measurements.measureBoundingBox(screw)
  expect(max[0] - min[0]).toBeCloseTo(1.5, 2)
  const x = (min[0] + max[0]) / 2
  const y = (min[1] + max[1]) / 2
  expect(isPointInsideMeshSection({ mesh: screw, point: [x, y, max[2] - 0.1] })).toBe(false)
  expect(isPointInsideMeshSection({ mesh: screw, point: [x, y + 0.5, max[2] - 0.1] })).toBe(true)

  const tails = readGlbComponentMesh({
    componentName: "POT1",
    glb,
    materialColorFilter: (color) => Boolean(color && Math.abs(color[0]! - 0.58) < 1e-6),
  })
  const surfaceZ = board.thickness / 2
  expect(pads).toHaveLength(3)
  for (const pad of pads) {
    if (typeof pad.x !== "number" || typeof pad.y !== "number")
      throw new Error("Missing POT1 land center")
    expect(isPointInsideMeshSection({ mesh: tails, point: [pad.x, pad.y, surfaceZ + 0.05] })).toBe(
      true,
    )
  }
})
