import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import { readGlbGoldContactMesh } from "./fixtures/read-glb-gold-contact-mesh"
import { getMeshContactCenters } from "./fixtures/get-mesh-contact-centers"
import {
  findMissingPackageContacts,
  readPrebuiltPackageReview,
} from "./fixtures/read-prebuilt-package-review"

test("microSD sockets have solder tails at the PCB and mating contacts below the lid", async () => {
  for (const { boardId, componentName, contactCount } of [
    { boardId: "tmds62levm", componentName: "J12", contactCount: 13 },
    { boardId: "sk-am62", componentName: "J20", contactCount: 13 },
    { boardId: "beagleplay", componentName: "J1", contactCount: 13 },
    { boardId: "beaglebone-black", componentName: "P10", contactCount: 16 },
  ]) {
    const review = await readPrebuiltPackageReview(boardId)
    const board = review.circuitJson.find((element) => element.type === "pcb_board")
    if (typeof board?.thickness !== "number") throw new Error("Missing board thickness")
    const source = review.circuitJson.find(
      (element) => element.type === "source_component" && element.name === componentName,
    )
    const component = review.circuitJson.find(
      (element) =>
        element.type === "pcb_component" &&
        element.source_component_id === source?.source_component_id,
    )
    if (!component) throw new Error(`Missing ${componentName}`)
    const surfaceZ = ((component.layer === "bottom" ? -1 : 1) * board.thickness) / 2
    const metal = readGlbComponentMesh({
      componentName,
      glb: review.glb,
      surfaceZ,
      materialColorFilter: (color) => Boolean(color && Math.min(...color.slice(0, 3)) > 0.5),
    })
    expect(getMeshContactCenters({ mesh: metal, surfaceZ })).toHaveLength(contactCount)
    expect(findMissingPackageContacts({ componentName, review })).toEqual([])
    const gold = readGlbGoldContactMesh({ componentName, glb: review.glb })
    const goldBounds = jscad.measurements.measureBoundingBox(gold)
    if (component.layer === "bottom") expect(goldBounds[0][2]).toBeGreaterThan(surfaceZ - 1)
    else expect(goldBounds[1][2]).toBeLessThan(surfaceZ + 1)
  }
})
