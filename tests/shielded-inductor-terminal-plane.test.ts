import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import {
  findMissingPackageContacts,
  readPrebuiltPackageReview,
} from "./fixtures/read-prebuilt-package-review"

test("large shielded-inductor terminations reach the mounting surface on both board sides", async () => {
  for (const { boardId, componentNames } of [
    { boardId: "tmds62levm", componentNames: ["L6", "L10", "L11"] },
    { boardId: "sk-am62", componentNames: ["L12"] },
  ]) {
    const review = await readPrebuiltPackageReview(boardId)
    for (const componentName of componentNames) {
      const source = review.circuitJson.find(
        (element) => element.type === "source_component" && element.name === componentName,
      )
      const component = review.circuitJson.find(
        (element) =>
          element.type === "pcb_component" &&
          element.source_component_id === source?.source_component_id,
      )
      if (!component) throw new Error(`Missing ${componentName}`)
      const metal = readGlbComponentMesh({
        componentName,
        glb: review.glb,
        materialColorFilter: (color) => Boolean(color && Math.min(...color.slice(0, 3)) > 0.5),
      })
      const bounds = jscad.measurements.measureBoundingBox(metal)
      const board = review.circuitJson.find((element) => element.type === "pcb_board")
      if (typeof board?.thickness !== "number") throw new Error("Missing board thickness")
      if (component.layer === "bottom") expect(bounds[1][2]).toBeCloseTo(-board.thickness / 2, 5)
      else expect(bounds[0][2]).toBeCloseTo(board.thickness / 2, 5)
      expect(findMissingPackageContacts({ componentName, review })).toEqual([])
    }
  }
})
