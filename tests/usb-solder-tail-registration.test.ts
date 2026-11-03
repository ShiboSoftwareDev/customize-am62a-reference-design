import { expect, test } from "bun:test"
import { applyToPoint, rotateDEG } from "transformation-matrix"
import { getMeshContactCenters } from "./fixtures/get-mesh-contact-centers"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import { readPrebuiltPackageReview } from "./fixtures/read-prebuilt-package-review"

test("manufacturer USB solder tails meet every numbered land on both Sitara boards", async () => {
  for (const { boardId, connectors } of [
    { boardId: "tmds62levm", connectors: { J7: 5, J8: 5, J15: 4 } },
    { boardId: "sk-am62", connectors: { J7: 4, J15: 5, J16: 5 } },
  ]) {
    const review = await readPrebuiltPackageReview(boardId)
    const board = review.circuitJson.find((element) => element.type === "pcb_board")
    if (typeof board?.thickness !== "number") throw new Error("Missing board thickness")
    const surfaceZ = board.thickness / 2
    for (const [componentName, contactCount] of Object.entries(connectors)) {
      const source = review.circuitJson.find(
        (element) => element.type === "source_component" && element.name === componentName,
      )
      const component = review.circuitJson.find(
        (element) =>
          element.type === "pcb_component" &&
          element.source_component_id === source?.source_component_id,
      )
      if (!component) throw new Error(`Missing ${componentName}`)
      const mesh = readGlbComponentMesh({ componentName, glb: review.glb, surfaceZ })
      const contacts = getMeshContactCenters({ mesh, surfaceZ })
      const pads = review.circuitJson.filter(
        (element) =>
          element.type === "pcb_smtpad" &&
          element.pcb_component_id === component.pcb_component_id &&
          Array.isArray(element.port_hints) &&
          element.port_hints.some((hint) => typeof hint === "string" && /^\d+$/u.test(hint)),
      )
      expect(pads).toHaveLength(contactCount)
      const matchedContactIndices = pads.map((pad) => {
        if (
          typeof pad.x !== "number" ||
          typeof pad.y !== "number" ||
          typeof pad.width !== "number" ||
          typeof pad.height !== "number"
        )
          throw new Error("Missing USB land geometry")
        const { x, y, width, height } = pad
        const boardToPadTransform = rotateDEG(-(pad.ccw_rotation ?? 0))
        return contacts.findIndex((contact) => {
          const localContact = applyToPoint(boardToPadTransform, {
            x: contact.x - x,
            y: contact.y - y,
          })
          return Math.abs(localContact.x) < width / 2 && Math.abs(localContact.y) < height / 2
        })
      })
      expect(matchedContactIndices).not.toContain(-1)
      expect(new Set(matchedContactIndices).size).toBe(contactCount)
    }
  }
})
