import { expect, test } from "bun:test"
import { getTiEvm } from "../lib/ti-evm-catalog"
import { isPointInsideMeshSection } from "./fixtures/is-point-inside-mesh-section"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import { readPrebuiltPackageReview } from "./fixtures/read-prebuilt-package-review"

test("BeagleBone Black P6 shell hold-downs enter both plated holes", async () => {
  for (const variant of getTiEvm("beaglebone-black").variants) {
    const { circuitJson, glb } = await readPrebuiltPackageReview("beaglebone-black", variant.id)
    const source = circuitJson.find(
      (element) => element.type === "source_component" && element.name === "P6",
    )
    if (variant.removedFeatureIds.includes("hdmi")) {
      expect(source).toBeUndefined()
      continue
    }
    if (!source) throw new Error(`Missing P6 in ${variant.id}`)
    const component = circuitJson.find(
      (element) =>
        element.type === "pcb_component" &&
        element.source_component_id === source.source_component_id,
    )
    const board = circuitJson.find((element) => element.type === "pcb_board")
    if (!component || typeof board?.thickness !== "number")
      throw new Error("Missing P6 footprint or board thickness")
    const holes = circuitJson.filter(
      (element) =>
        element.type === "pcb_plated_hole" &&
        element.pcb_component_id === component.pcb_component_id,
    )
    expect(holes).toHaveLength(2)

    const mesh = readGlbComponentMesh({ componentName: "P6", glb })
    // P6 is on the bottom. Its 0.55 mm hold-downs enter the PCB from below.
    const insideBoardZ = -board.thickness / 2 + 0.3
    for (const hole of holes) {
      if (typeof hole.x !== "number" || typeof hole.y !== "number")
        throw new Error("Missing P6 hole center")
      expect(
        isPointInsideMeshSection({ mesh, point: [hole.x, hole.y, insideBoardZ] }),
        `${variant.id} ${hole.pcb_plated_hole_id}`,
      ).toBe(true)
    }
  }
})
