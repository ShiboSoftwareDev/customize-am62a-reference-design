import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import { getMeshContactCenters } from "./fixtures/get-mesh-contact-centers"
import {
  findMissingPackageContacts,
  readPrebuiltPackageReview,
} from "./fixtures/read-prebuilt-package-review"

test("Sitara two-terminal SON models have the reference envelope and two separate landed contacts", async () => {
  for (const boardId of ["tmds62levm", "sk-am62", "beagleplay"]) {
    const review = await readPrebuiltPackageReview(boardId)
    const board = review.circuitJson.find((element) => element.type === "pcb_board")
    if (typeof board?.thickness !== "number") throw new Error("Missing board thickness")
    let checkedComponentCount = 0
    for (const source of review.circuitJson) {
      if (source.type !== "source_component" || typeof source.name !== "string") continue
      const footprint = review.footprints[source.name]
      if (!/^(?:DIO_DFN(?:0201|0402)|X1SON2_)/u.test(footprint ?? "")) continue
      const component = review.circuitJson.find(
        (element) =>
          element.type === "pcb_component" &&
          element.source_component_id === source.source_component_id,
      )
      if (!component) throw new Error(`Missing ${source.name} PCB component`)
      const mesh = readGlbComponentMesh({ componentName: source.name, glb: review.glb })
      const dimensions = jscad.measurements.measureDimensions(mesh)
      const planarDimensions = dimensions.slice(0, 2).sort((first, second) => first - second)
      const is0201 = footprint.startsWith("DIO_DFN0201")
      let height = 0.5
      if (is0201) height = 0.32
      if (footprint.startsWith("X1SON2_")) height = 0.45
      expect(planarDimensions[0], `${boardId} ${source.name} width`).toBeCloseTo(
        is0201 ? 0.3 : 0.6,
        4,
      )
      expect(planarDimensions[1], `${boardId} ${source.name} length`).toBeCloseTo(
        is0201 ? 0.6 : 1,
        4,
      )
      expect(dimensions[2], `${boardId} ${source.name} height`).toBeCloseTo(height, 4)
      const surfaceZ = ((component.layer === "bottom" ? -1 : 1) * board.thickness) / 2
      const contacts = getMeshContactCenters({
        surfaceZ,
        mesh: readGlbComponentMesh({
          componentName: source.name,
          glb: review.glb,
          materialColorFilter: (color) => Boolean(color && Math.min(...color.slice(0, 3)) > 0.5),
        }),
      })
      expect(contacts, `${boardId} ${source.name} contacts`).toHaveLength(2)
      expect(
        Math.hypot(contacts[0]!.x - contacts[1]!.x, contacts[0]!.y - contacts[1]!.y),
      ).toBeCloseTo(is0201 ? 0.35 : 0.65, 4)
      expect(
        findMissingPackageContacts({ componentName: source.name, review }),
        `${boardId} ${source.name}`,
      ).toEqual([])
      checkedComponentCount++
    }
    expect(checkedComponentCount).toBeGreaterThan(0)
  }
})
