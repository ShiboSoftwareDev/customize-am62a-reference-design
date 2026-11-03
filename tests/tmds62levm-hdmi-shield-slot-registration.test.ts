import { expect, test } from "bun:test"
import type { Vec3 } from "@jscad/modeling/src/maths/types"
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
      const { x, y, hole_width: width, hole_height: height } = slot
      if (
        typeof x !== "number" ||
        typeof y !== "number" ||
        typeof width !== "number" ||
        typeof height !== "number"
      ) {
        throw new Error("Missing HDMI shield slot geometry")
      }
      // J13's slots are horizontal capsules in board coordinates.
      expect(slot.ccw_rotation).toBe(0)
      const radius = height / 2
      const straightHalfLength = (width - height) / 2
      for (const z of [-0.6, 0, 0.6]) {
        expect(
          isPointInsideMeshSection({ mesh, point: [x, y, z] }),
          `${variant.id} ${slot.pcb_plated_hole_id} at Z=${z}`,
        ).toBe(true)
        const section = mesh.polygons
          .flatMap(({ vertices }) => getSectionPoints({ vertices, z }))
          .filter(([px, py]) => Math.abs(px - x) < width && Math.abs(py - y) < height)
        expect(section.length).toBeGreaterThan(0)
        for (const [px, py] of section) {
          const endOffset = Math.max(0, Math.abs(px - x) - straightHalfLength)
          expect(Math.hypot(endOffset, py - y)).toBeLessThan(radius)
        }
      }
    }
  }
  expect(hdmiVariantCount).toBe(4)
})

function getSectionPoints({ vertices, z }: { vertices: Vec3[]; z: number }): Vec3[] {
  return vertices.flatMap((start, index) => {
    const end = vertices[(index + 1) % vertices.length]!
    if (start[2] === z) return [start]
    if (start[2] < z === end[2] < z) return []
    const fraction = (z - start[2]) / (end[2] - start[2])
    return [
      [start[0] + (end[0] - start[0]) * fraction, start[1] + (end[1] - start[1]) * fraction, z],
    ]
  })
}
