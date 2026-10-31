import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import { readGlbGoldContactMesh } from "./fixtures/read-glb-gold-contact-mesh"

test("BeaglePlay's cached USB-A and USB-C contacts stay on their plastic tongues", async () => {
  const glb = await Bun.file(
    new URL("../public/prebuilt-ti-evms/beagleplay/full-board.glb", import.meta.url),
  ).arrayBuffer()
  for (const componentName of ["J13", "J14"]) {
    const contacts = readGlbGoldContactMesh({ componentName, glb })
    const tongue = readGlbComponentMesh({
      componentName,
      glb,
      materialColorFilter: (color) => Boolean(color && color[0]! < 0.05),
    })
    const [tongueMin, tongueMax] = jscad.measurements.measureBoundingBox(tongue)
    const [contactMin, contactMax] = jscad.measurements.measureBoundingBox(contacts)
    const contactsAtTongueHeight = jscad.transforms.translateZ(
      (tongueMin[2] + tongueMax[2] - contactMin[2] - contactMax[2]) / 2,
      contacts,
    )
    expect(jscad.measurements.measureVolume(contacts)).toBeGreaterThan(0)
    expect(
      jscad.measurements.measureVolume(jscad.booleans.subtract(contactsAtTongueHeight, tongue)),
    ).toBeCloseTo(0, 5)
  }
})
