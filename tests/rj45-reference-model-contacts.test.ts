import { expect, test } from "bun:test"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import { isPointInsideMeshSection } from "./fixtures/is-point-inside-mesh-section"
import { readPrebuiltPackageReview } from "./fixtures/read-prebuilt-package-review"

test("LINK-PP reference signal and LED leads cross their imported plated holes", async () => {
  for (const boardId of ["tmds62levm", "sk-am62"]) {
    const review = await readPrebuiltPackageReview(boardId)
    const connectors = Object.entries(review.footprints).filter(([, footprint]) =>
      footprint.includes("LPJG16314A4NL"),
    )
    expect(connectors).toHaveLength(2)
    for (const [componentName] of connectors) {
      const source = review.circuitJson.find(
        (element) => element.type === "source_component" && element.name === componentName,
      )
      const component = review.circuitJson.find(
        (element) =>
          element.type === "pcb_component" &&
          element.source_component_id === source?.source_component_id,
      )
      if (!component) throw new Error(`Missing ${componentName}`)
      const mesh = readGlbComponentMesh({ componentName, glb: review.glb })
      const signalHoles = review.circuitJson.filter(
        (element) =>
          element.type === "pcb_plated_hole" &&
          element.pcb_component_id === component.pcb_component_id &&
          Array.isArray(element.port_hints) &&
          element.port_hints.some(
            (hint) => typeof hint === "string" && /^(?:[1-9]|1[0-4])$/u.test(hint),
          ),
      )
      expect(signalHoles).toHaveLength(14)
      for (const hole of signalHoles) {
        if (typeof hole.x !== "number" || typeof hole.y !== "number")
          throw new Error("Missing hole center")
        expect(
          isPointInsideMeshSection({ mesh, point: [hole.x, hole.y, 0] }),
          `${boardId} ${componentName} ${String(hole.pcb_plated_hole_id)}`,
        ).toBe(true)
      }
    }
  }
})
