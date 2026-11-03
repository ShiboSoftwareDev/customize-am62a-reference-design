import { expect, test } from "bun:test"
import { applyToPoint, rotateDEG } from "transformation-matrix"
import { getMeshContactCenters } from "./fixtures/get-mesh-contact-centers"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import { readPrebuiltPackageReview } from "./fixtures/read-prebuilt-package-review"

test("HDMI solder tails land on all 19 signal pads on both mounting sides", async () => {
  const unregisteredPads: string[] = []
  for (const { boardId, componentName } of [
    { boardId: "tmds62levm", componentName: "J13" },
    { boardId: "sk-am62", componentName: "J5" },
    { boardId: "beaglebone-black", componentName: "P6" },
  ] as const) {
    const review = await readPrebuiltPackageReview(boardId)
    const source = review.circuitJson.find(
      (element) => element.type === "source_component" && element.name === componentName,
    )
    const component = review.circuitJson.find(
      (element) =>
        element.type === "pcb_component" &&
        element.source_component_id === source?.source_component_id,
    )
    if (!component) throw new Error(`Missing ${componentName}`)
    const board = review.circuitJson.find((element) => element.type === "pcb_board")
    if (typeof board?.thickness !== "number") throw new Error("Missing board thickness")
    const surfaceZ = ((component.layer === "bottom" ? -1 : 1) * board.thickness) / 2
    const mesh = readGlbComponentMesh({
      componentName,
      glb: review.glb,
      surfaceZ,
      materialColorFilter: (color) => Boolean(color && Math.min(...color.slice(0, 3)) > 0.4),
    })
    const contacts = getMeshContactCenters({ mesh, surfaceZ })
    const signalPads = review.circuitJson.filter(
      (element) =>
        element.type === "pcb_smtpad" &&
        element.pcb_component_id === component.pcb_component_id &&
        Array.isArray(element.port_hints) &&
        element.port_hints.some(
          (hint) => typeof hint === "string" && /^\d+$/u.test(hint) && Number(hint) <= 19,
        ),
    )
    expect(signalPads).toHaveLength(19)
    const matchedContactIndices = signalPads.map((pad) => {
      if (
        typeof pad.x !== "number" ||
        typeof pad.y !== "number" ||
        typeof pad.width !== "number" ||
        typeof pad.height !== "number"
      )
        throw new Error("Missing HDMI land geometry")
      const { x, y, width, height } = pad
      const boardToPadTransform = rotateDEG(
        typeof pad.ccw_rotation === "number" ? -pad.ccw_rotation : 0,
      )
      const contactIndex = contacts.findIndex((contact) => {
        const localContact = applyToPoint(boardToPadTransform, {
          x: contact.x - x,
          y: contact.y - y,
        })
        return Math.abs(localContact.x) <= width / 2 && Math.abs(localContact.y) <= height / 2
      })
      if (contactIndex < 0) unregisteredPads.push(`${boardId} ${componentName} ${pad.port_hints}`)
      return contactIndex
    })
    if (!matchedContactIndices.includes(-1)) expect(new Set(matchedContactIndices).size).toBe(19)
  }
  expect(unregisteredPads).toEqual([])
})
