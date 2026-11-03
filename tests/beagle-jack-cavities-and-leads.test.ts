import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { getTiEvm } from "../lib/ti-evm-catalog"
import { getMeshContactCenters } from "./fixtures/get-mesh-contact-centers"
import { isPointInsideMeshSection } from "./fixtures/is-point-inside-mesh-section"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import { readPrebuiltPackageReview } from "./fixtures/read-prebuilt-package-review"
import type { Vec3 } from "@jscad/modeling/src/maths/types"

const jacks = [
  {
    boardId: "beaglebone-black",
    componentName: "P1",
    holeCount: 3,
    cavityPoint: [375.66426, 274.73034, 6.1] satisfies Vec3,
  },
  {
    boardId: "beagleplay",
    componentName: "J2",
    holeCount: 6,
    cavityPoint: [-263.103868, 233.267436, 7.3] satisfies Vec3,
  },
] as const

test.each(jacks)(
  "$boardId $componentName has an open mating cavity and leads through its PCB holes",
  async ({ boardId, componentName, holeCount, cavityPoint }) => {
    for (const variant of getTiEvm(boardId).variants) {
      const { circuitJson, glb } = await readPrebuiltPackageReview(boardId, variant.id)
      const source = circuitJson.find(
        (element) => element.type === "source_component" && element.name === componentName,
      )
      if (!source && variant.id !== "full-board") continue
      const component = circuitJson.find(
        (element) =>
          element.type === "pcb_component" &&
          element.source_component_id === source?.source_component_id,
      )
      if (!component) throw new Error(`Missing ${componentName} PCB component`)

      const mesh = readGlbComponentMesh({ componentName, glb })
      expect(isPointInsideMeshSection({ point: [...cavityPoint], mesh })).toBe(false)
      if (componentName === "J2") {
        const contacts = readGlbComponentMesh({
          componentName,
          glb,
          materialColorFilter: (color) => Boolean(color && color[0]! > 0.8 && color[2]! < 0.2),
        })
        const [[, , contactBottom]] = jscad.measurements.measureBoundingBox(contacts)
        expect(getMeshContactCenters({ mesh: contacts, surfaceZ: contactBottom })).toHaveLength(4)
      } else {
        const center = component.center
        if (
          !center ||
          typeof center !== "object" ||
          !("x" in center) ||
          !("y" in center) ||
          typeof center.x !== "number" ||
          typeof center.y !== "number"
        )
          throw new Error("Missing barrel jack center")
        const { x, y } = center
        // The 2 mm center post sits inside the open bore at Z=6.1 mm.
        expect(isPointInsideMeshSection({ point: [x - 5, y + 0.9, 6.1], mesh })).toBe(true)
        expect(isPointInsideMeshSection({ point: [x - 5, y + 1.1, 6.1], mesh })).toBe(false)
      }
      const holes = circuitJson.filter(
        (element) =>
          element.type === "pcb_plated_hole" &&
          element.pcb_component_id === component.pcb_component_id,
      )
      expect(holes).toHaveLength(holeCount)
      for (const hole of holes) {
        if (typeof hole.x !== "number" || typeof hole.y !== "number")
          throw new Error("Missing plated hole center")
        expect(isPointInsideMeshSection({ point: [hole.x, hole.y, 0], mesh })).toBe(true)
      }
    }
  },
)
