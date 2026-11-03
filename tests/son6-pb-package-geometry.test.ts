import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { getMeshContactCenters } from "./fixtures/get-mesh-contact-centers"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import {
  findMissingPackageContacts,
  readPrebuiltPackageReview,
} from "./fixtures/read-prebuilt-package-review"

test("the Sitara DRY six-terminal packages retain their 0.6 mm height without a center contact", async () => {
  for (const { boardId, componentName } of [
    { boardId: "sk-am62", componentName: "U89" },
    { boardId: "tmds62levm", componentName: "U84" },
  ]) {
    const review = await readPrebuiltPackageReview(boardId)
    const mesh = readGlbComponentMesh({ componentName, glb: review.glb })
    expect(jscad.measurements.measureDimensions(mesh)[2]).toBeCloseTo(0.6, 4)
    const board = review.circuitJson.find((element) => element.type === "pcb_board")
    if (typeof board?.thickness !== "number") throw new Error("Missing board thickness")
    expect(getMeshContactCenters({ mesh, surfaceZ: -board.thickness / 2 })).toHaveLength(6)
    expect(findMissingPackageContacts({ componentName, review })).toEqual([])
  }
})
