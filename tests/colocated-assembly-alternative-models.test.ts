import { expect, test } from "bun:test"
import { tiEvms } from "../lib/ti-evm-catalog"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"

test("cached scenes show the fitted assembly instead of overlapping co-layout alternatives", async () => {
  for (const { boardId, fitted, notFitted } of [
    {
      boardId: "tmds62levm",
      fitted: ["L2", "L9", "R143", "R121", "R122", "R311"],
      notFitted: ["R181", "R185", "R266", "R271", "R144", "R115", "R119", "R302"],
    },
    {
      boardId: "sk-am62",
      fitted: ["R3", "R4", "R8", "R280", "R281", "R282", "R283", "R284", "R320", "R336"],
      notFitted: ["R1", "R2", "R9", "R275", "R276", "R277", "R278", "R279", "R53", "R337"],
    },
    {
      boardId: "beagleplay",
      fitted: ["C1", "L15", "L20", "R220"],
      notFitted: ["R221", "R219", "R225", "R264", "R265", "C254"],
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
