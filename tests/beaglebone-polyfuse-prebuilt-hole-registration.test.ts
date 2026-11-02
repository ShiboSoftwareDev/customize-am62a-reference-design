import { expect, test } from "bun:test"
import { getTiEvm } from "../lib/ti-evm-catalog"
import { parsePrebuiltCircuitJson } from "../app/parse-prebuilt-circuit-json"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import { isPointInsideMeshSection } from "./fixtures/is-point-inside-mesh-section"

test("BeagleBone's RXEF010 leads pass through its staggered footprint holes", async () => {
  for (const variant of getTiEvm("beaglebone-black").variants) {
    const circuitJson = parsePrebuiltCircuitJson(
      new Uint8Array(await Bun.file(`public${variant.circuitJsonUrl}`).arrayBuffer()),
    )
    const source = circuitJson.find(
      (element) => element.type === "source_component" && element.name === "RT1",
    )
    const component = circuitJson.find(
      (element) =>
        element.type === "pcb_component" &&
        element.source_component_id === source?.source_component_id,
    )
    if (!component) continue
    const mesh = readGlbComponentMesh({
      componentName: "RT1",
      glb: await Bun.file(`public${variant.prebuiltCadSceneUrl}`).arrayBuffer(),
    })
    const holes = circuitJson.filter(
      (element) =>
        element.type === "pcb_plated_hole" &&
        element.pcb_component_id === component.pcb_component_id,
    )
    expect(holes).toHaveLength(2)
    for (const hole of holes) {
      if (typeof hole.x !== "number" || typeof hole.y !== "number")
        throw new Error("Missing hole center")
      expect(
        isPointInsideMeshSection({ point: [hole.x, hole.y, 0], mesh }),
        `${variant.id} ${hole.pcb_plated_hole_id}`,
      ).toBe(true)
    }
  }
})
