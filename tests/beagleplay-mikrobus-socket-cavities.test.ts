import { expect, test } from "bun:test"
import { isPointInsideMeshSection } from "./fixtures/is-point-inside-mesh-section"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import { readPrebuiltPackageReview } from "./fixtures/read-prebuilt-package-review"

test("BeaglePlay J21 has 16 recessed pin openings", async () => {
  const { circuitJson, glb } = await readPrebuiltPackageReview("beagleplay")
  const source = circuitJson.find((el) => el.type === "source_component" && el.name === "J21")
  const component = circuitJson.find(
    (el) => el.type === "pcb_component" && el.source_component_id === source?.source_component_id,
  )
  const board = circuitJson.find((el) => el.type === "pcb_board")
  if (!component || typeof board?.thickness !== "number") throw new Error("Missing J21 footprint")
  const pads = circuitJson
    .filter((el) => el.type === "pcb_smtpad" && el.pcb_component_id === component.pcb_component_id)
    .map(({ x, y }) => {
      if (typeof x !== "number" || typeof y !== "number") throw new Error("Missing J21 land center")
      return { x, y }
    })
  expect(pads).toHaveLength(16)
  const midY = (Math.min(...pads.map(({ y }) => y)) + Math.max(...pads.map(({ y }) => y))) / 2
  const socketFaceZ = board.thickness / 2 + 8.5
  const mesh = readGlbComponentMesh({ componentName: "J21", glb })
  for (const pad of pads) {
    // The socket centers sit 1.45 mm inward from their SMT lands.
    const y = pad.y - Math.sign(pad.y - midY) * 1.45
    for (const depth of [-0.03, 0.2, 2, 3]) {
      for (const dx of [-0.32, 0.32]) {
        for (const dy of [-0.32, 0.32]) {
          expect(
            isPointInsideMeshSection({
              mesh,
              point: [pad.x + dx, y + dy, socketFaceZ - depth],
            }),
          ).toBe(false)
        }
      }
    }
    expect(isPointInsideMeshSection({ mesh, point: [pad.x, y, socketFaceZ - 4] })).toBe(true)
  }
})
