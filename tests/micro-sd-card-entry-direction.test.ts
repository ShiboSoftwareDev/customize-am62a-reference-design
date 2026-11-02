import { expect, test } from "bun:test"
import { isPointInsideMeshSection } from "./fixtures/is-point-inside-mesh-section"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import { readPrebuiltPackageReview } from "./fixtures/read-prebuilt-package-review"

test("microSD sockets open toward the reference board edge on both mounting sides", async () => {
  for (const { boardId, componentName, entryDirectionX } of [
    { boardId: "tmds62levm", componentName: "J12", entryDirectionX: 1 },
    { boardId: "sk-am62", componentName: "J20", entryDirectionX: -1 },
    { boardId: "beagleplay", componentName: "J1", entryDirectionX: 1 },
    { boardId: "beaglebone-black", componentName: "P10", entryDirectionX: 1 },
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
    const center = component.center
    if (
      !center ||
      typeof center !== "object" ||
      !("x" in center) ||
      !("y" in center) ||
      typeof center.x !== "number" ||
      typeof center.y !== "number"
    )
      throw new Error("Missing microSD placement")
    const board = review.circuitJson.find((element) => element.type === "pcb_board")
    if (typeof board?.thickness !== "number") throw new Error("Missing board thickness")
    const mesh = readGlbComponentMesh({ componentName, glb: review.glb })
    const cardPlaneZ = (component.layer === "bottom" ? -1 : 1) * (board.thickness / 2 + 0.9)
    // Probe the card cavity at each end of the shell, below its metal lid.
    // The entry must be clear; the opposite end must retain its rear wall.
    expect(
      isPointInsideMeshSection({
        mesh,
        point: [center.x + entryDirectionX * 6.2, center.y, cardPlaneZ],
      }),
      `${boardId} ${componentName} card entry`,
    ).toBe(false)
    expect(
      isPointInsideMeshSection({
        mesh,
        point: [center.x - entryDirectionX * 6.2, center.y, cardPlaneZ],
      }),
      `${boardId} ${componentName} rear wall`,
    ).toBe(true)
  }
})
