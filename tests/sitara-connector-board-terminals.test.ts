import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import type { Vec3 } from "@jscad/modeling/src/maths/types"
import { isPointInsideMeshSection } from "./fixtures/is-point-inside-mesh-section"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import { readPrebuiltPackageReview } from "./fixtures/read-prebuilt-package-review"

const connectors = [
  { board: "beaglebone-black", names: ["P3", "P5"] },
  { board: "beagleplay", names: ["J13", "J14", "J24"] },
  { board: "sk-am62", names: ["J11", "J13"] },
  { board: "tmds62levm", names: ["J17", "J19"] },
]

test("RJ45 and USB connector models seat their terminals in the imported footprints", async () => {
  for (const { board, names } of connectors) {
    const { circuitJson, glb, footprints } = await readPrebuiltPackageReview(board)
    const boardElement = circuitJson.find((element) => element.type === "pcb_board")
    if (typeof boardElement?.thickness !== "number") throw new Error("Missing board thickness")
    for (const componentName of names) {
      const source = circuitJson.find(
        (element) => element.type === "source_component" && element.name === componentName,
      )
      const component = circuitJson.find(
        (element) =>
          element.type === "pcb_component" &&
          element.source_component_id === source?.source_component_id,
      )
      if (!component) throw new Error(`Missing ${componentName}`)
      const mesh = readGlbComponentMesh({ componentName, glb })
      const pads = circuitJson.filter(
        (element) => element.pcb_component_id === component.pcb_component_id,
      )
      const holes = pads.filter((element) => element.type === "pcb_plated_hole")
      expect(holes.length).toBeGreaterThan(0)
      for (const hole of holes) {
        if (typeof hole.x !== "number" || typeof hole.y !== "number")
          throw new Error("Missing plated hole center")
        const x = hole.x + (typeof hole.hole_offset_x === "number" ? hole.hole_offset_x : 0)
        const y = hole.y + (typeof hole.hole_offset_y === "number" ? hole.hole_offset_y : 0)
        expect(
          isPointInsideMeshSection({ mesh, point: [x, y, 0] }),
          `${board} ${componentName} ${hole.pcb_plated_hole_id}`,
        ).toBe(true)
      }

      if (footprints[componentName]?.startsWith("RJ45")) {
        const shell = readGlbComponentMesh({
          componentName,
          glb,
          materialColorFilter: (color) => Boolean(color && Math.abs(color[0]! - 0.58) < 1e-6),
        })
        const [min, max] = jscad.measurements.measureBoundingBox(shell)
        const point: Vec3 = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, 6]
        if (componentName === "P5") point[0] = min[0] + 0.6
        else point[1] = min[1] + 0.6
        expect(isPointInsideMeshSection({ mesh, point })).toBe(false)
      }

      const signalPads = pads.filter(
        (pad) =>
          pad.type === "pcb_smtpad" &&
          Array.isArray(pad.port_hints) &&
          pad.port_hints.some((hint) => typeof hint === "string" && /^[AB]\d+$/u.test(hint)),
      )
      if (signalPads.length === 0) continue
      const contacts = readGlbComponentMesh({
        componentName,
        glb,
        materialColorFilter: (color) => Boolean(color && color[0]! > 0.8 && color[2]! < 0.2),
      })
      for (const pad of signalPads) {
        if (typeof pad.x !== "number" || typeof pad.y !== "number")
          throw new Error("Missing solder land center")
        expect(
          isPointInsideMeshSection({
            mesh: contacts,
            point: [pad.x, pad.y, boardElement.thickness / 2 + 0.05],
          }),
          `${board} ${componentName} ${pad.pcb_smtpad_id}`,
        ).toBe(true)
      }
    }
  }
})
