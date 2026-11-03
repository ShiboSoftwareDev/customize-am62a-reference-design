import { expect, test } from "bun:test"
import { parsePrebuiltCircuitJson } from "../app/parse-prebuilt-circuit-json"
import { getTiEvm } from "../lib/ti-evm-catalog"
import { isPointInsideMeshSection } from "./fixtures/is-point-inside-mesh-section"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"

test("TMDS62LEVM J13 seats all four HDMI shield tabs in every HDMI variant", async () => {
  let hdmiVariantCount = 0
  for (const variant of getTiEvm("tmds62levm").variants) {
    const circuitJson = parsePrebuiltCircuitJson(
      new Uint8Array(await Bun.file(`public${variant.circuitJsonUrl}`).arrayBuffer()),
    )
    const source = circuitJson.find(
      (element) => element.type === "source_component" && element.name === "J13",
    )
    if (!source) continue
    hdmiVariantCount++
    const component = circuitJson.find(
      (element) =>
        element.type === "pcb_component" &&
        element.source_component_id === source.source_component_id,
    )
    if (!component) throw new Error("Missing HDMI footprint")

    const mesh = readGlbComponentMesh({
      componentName: "J13",
      glb: await Bun.file(`public${variant.prebuiltCadSceneUrl}`).arrayBuffer(),
    })
    const shieldSlots = circuitJson.filter(
      (element) =>
        element.type === "pcb_plated_hole" &&
        element.pcb_component_id === component.pcb_component_id &&
        Array.isArray(element.port_hints) &&
        element.port_hints.some((hint) => typeof hint === "string" && /^SH[1-4]$/u.test(hint)),
    )
    expect(shieldSlots).toHaveLength(4)
    for (const slot of shieldSlots) {
      if (typeof slot.x !== "number" || typeof slot.y !== "number") {
        throw new Error("Missing HDMI shield slot center")
      }
      for (const z of [-0.6, 0, 0.6]) {
        expect(
          isPointInsideMeshSection({ mesh, point: [slot.x, slot.y, z] }),
          `${variant.id} ${slot.pcb_plated_hole_id} at Z=${z}`,
        ).toBe(true)
      }
    }
  }
  expect(hdmiVariantCount).toBe(4)
})
