import { expect, test } from "bun:test"
import { tiEvms } from "../lib/ti-evm-catalog"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"

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
      const glb = await Bun.file(`public${variant.prebuiltCadSceneUrl}`).arrayBuffer()
      if (variant.id === "full-board") {
        for (const componentName of fitted) {
          expect(readGlbComponentMesh({ componentName, glb }).polygons.length).toBeGreaterThan(0)
        }
      }
      for (const componentName of notFitted) {
        expect(() => {
          readGlbComponentMesh({ componentName, glb })
        }).toThrow(`Missing ${componentName} mesh`)
      }
    }
  }
})
