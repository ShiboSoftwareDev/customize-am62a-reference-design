import { expect, test } from "bun:test"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import { isPointInsideMeshSection } from "./fixtures/is-point-inside-mesh-section"

test("reference connector housings clear the fitted protection and decoupling parts", async () => {
  for (const { boardId, connector, neighbor, point } of [
    {
      boardId: "tmds62levm",
      connector: "J5",
      neighbor: "C23",
      point: [116.8087146, 116.897403, 0.862054],
    },
    {
      boardId: "tmds62levm",
      connector: "J9",
      neighbor: "C76",
      point: [116.8087146, 92.841063, 0.862054],
    },
    {
      boardId: "beagleplay",
      connector: "J1",
      neighbor: "D13",
      point: [-269.9419958, 274.482516, 1.0350998],
    },
  ] as const) {
    const glb = await Bun.file(`public/prebuilt-ti-evms/${boardId}/full-board.glb`).arrayBuffer()
    const neighborMesh = readGlbComponentMesh({ componentName: neighbor, glb })
    const connectorMesh = readGlbComponentMesh({ componentName: connector, glb })
    // Independent samples from the fitted neighboring solids, not their AABBs.
    expect(isPointInsideMeshSection({ point: [...point], mesh: neighborMesh }), neighbor).toBe(true)
    expect(isPointInsideMeshSection({ point: [...point], mesh: connectorMesh }), connector).toBe(
      false,
    )
  }
})
