import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { getMeshContactCenters } from "./fixtures/get-mesh-contact-centers"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import { readGlbGoldContactMesh } from "./fixtures/read-glb-gold-contact-mesh"

test("cached USB-C receptacles have the correct contacts on both tongue faces", async () => {
  const boards = [
    {
      id: "beagleplay",
      names: ["J14"],
      offsets: [-2.75, -1.25, -0.75, -0.25, 0.25, 0.75, 1.25, 2.75],
    },
    {
      id: "sk-am62",
      names: ["J11", "J13"],
      offsets: [-2.75, -2.25, -1.75, -1.25, -0.75, -0.25, 0.25, 0.75, 1.25, 1.75, 2.25, 2.75],
    },
    {
      id: "tmds62levm",
      names: ["J17", "J19"],
      offsets: [-2.75, -2.25, -1.75, -1.25, -0.75, -0.25, 0.25, 0.75, 1.25, 1.75, 2.25, 2.75],
    },
  ]
  for (const { id, names, offsets } of boards) {
    const glb = await Bun.file(
      new URL(`../public/prebuilt-ti-evms/${id}/full-board.glb`, import.meta.url),
    ).arrayBuffer()
    for (const componentName of names) {
      const tongue = readGlbComponentMesh({
        componentName,
        glb,
        materialColorFilter: (color) => Boolean(color && color[0]! < 0.05),
      })
      const [tongueMin, tongueMax] = jscad.measurements.measureBoundingBox(tongue)
      const contacts = readGlbGoldContactMesh({ componentName, glb })
      for (const surfaceZ of [tongueMin[2] - 0.06, tongueMax[2] + 0.06]) {
        const centers = getMeshContactCenters({ mesh: contacts, surfaceZ })
        expect(centers, `${id} ${componentName} at Z=${surfaceZ}`).toHaveLength(offsets.length)
        // The row runs along the wider span, depending on the PCB rotation.
        const axis = tongueMax[0] - tongueMin[0] > tongueMax[1] - tongueMin[1] ? "x" : "y"
        const axisIndex = axis === "x" ? 0 : 1
        const rowCenter = (tongueMin[axisIndex] + tongueMax[axisIndex]) / 2
        const actualOffsets = centers
          .map((center) => center[axis] - rowCenter)
          .sort((a, b) => a - b)
        for (const [index, offset] of offsets.entries()) {
          expect(actualOffsets[index]).toBeCloseTo(offset, 4)
        }
      }
    }
  }
})
