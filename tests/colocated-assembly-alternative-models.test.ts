import { expect, test } from "bun:test"
import { tiEvms } from "../lib/ti-evm-catalog"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import { readPrebuiltPackageReview } from "./fixtures/read-prebuilt-package-review"

test("cached scenes show the fitted assembly instead of overlapping co-layout alternatives", async () => {
  for (const { boardId, fitted, notFitted } of [
    {
      boardId: "tmds62levm",
      fitted: ["L2", "L9"],
      notFitted: ["R181", "R185", "R266", "R271"],
    },
    {
      boardId: "beagleplay",
      fitted: ["C1", "L15", "L20"],
      notFitted: ["R221", "R219", "R225", "R264", "R265"],
    },
  ]) {
    const board = tiEvms.find((evm) => evm.id === boardId)
    if (!board) throw new Error(`Missing ${boardId}`)
    for (const variant of board.variants) {
      const review = await readPrebuiltPackageReview(boardId, variant.id)
      const presentNames = review.circuitJson.flatMap((element) =>
        element.type === "source_component" ? [element.name] : [],
      )
      for (const componentName of fitted) {
        if (!presentNames.includes(componentName)) continue
        expect(
          readGlbComponentMesh({ componentName, glb: review.glb }).polygons.length,
        ).toBeGreaterThan(0)
      }
      for (const componentName of notFitted) {
        expect(() => {
          readGlbComponentMesh({ componentName, glb: review.glb })
        }).toThrow(`Missing ${componentName} mesh`)
      }
    }
  }
})
