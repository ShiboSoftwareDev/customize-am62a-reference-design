import { expect, test } from "bun:test"
import { isPointInsideMeshSection } from "./fixtures/is-point-inside-mesh-section"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import { readPrebuiltPackageReview } from "./fixtures/read-prebuilt-package-review"

test("BeagleBone Black P6 signal tails rise off the pads into the rear insulator", async () => {
  const { circuitJson, glb } = await readPrebuiltPackageReview("beaglebone-black")
  const source = circuitJson.find(
    (element) => element.type === "source_component" && element.name === "P6",
  )
  const component = circuitJson.find(
    (element) =>
      element.type === "pcb_component" &&
      element.source_component_id === source?.source_component_id,
  )
  const board = circuitJson.find((element) => element.type === "pcb_board")
  if (!component || typeof board?.thickness !== "number") throw new Error("Missing P6 footprint")

  const signalPads = circuitJson.filter(
    (element) =>
      element.type === "pcb_smtpad" &&
      element.pcb_component_id === component.pcb_component_id &&
      Array.isArray(element.port_hints) &&
      element.port_hints.some(
        (hint) => typeof hint === "string" && /^(?:[1-9]|1[0-9])$/u.test(hint),
      ),
  )
  expect(signalPads).toHaveLength(19)
  const metal = readGlbComponentMesh({
    componentName: "P6",
    glb,
    materialColorFilter: (color) => Boolean(color && Math.min(...color.slice(0, 3)) > 0.4),
  })
  const plastic = readGlbComponentMesh({
    componentName: "P6",
    glb,
    materialColorFilter: (color) => Boolean(color && Math.max(...color.slice(0, 3)) < 0.1),
  })
  const surfaceZ = -board.thickness / 2
  for (const pad of signalPads) {
    if (typeof pad.x !== "number" || typeof pad.y !== "number")
      throw new Error("Missing pad center")
    // On this bottom-mounted footprint, the tail rises toward the connector
    // body 0.2 mm toward +X from the land center.
    for (const height of [0.08, 0.55, 1.03]) {
      expect(
        isPointInsideMeshSection({ mesh: metal, point: [pad.x + 0.2, pad.y, surfaceZ - height] }),
        `${pad.pcb_smtpad_id} at ${height} mm`,
      ).toBe(true)
    }
    expect(
      isPointInsideMeshSection({ mesh: plastic, point: [pad.x + 0.2, pad.y, surfaceZ - 1.03] }),
    ).toBe(true)
  }
})
