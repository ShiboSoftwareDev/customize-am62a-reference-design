import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import { readGlbGoldContactMesh } from "./fixtures/read-glb-gold-contact-mesh"

test("BeaglePlay's cached USB-C contacts stay on the plastic tongue", async () => {
  const glb = await Bun.file(
    new URL("../public/prebuilt-ti-evms/beagleplay/full-board.glb", import.meta.url),
  ).arrayBuffer()
  const componentName = "J14"
  const tongue = readGlbComponentMesh({
    componentName,
    glb,
    materialColorFilter: (color) => Boolean(color && color[0]! < 0.05),
  })
  const [tongueMin, tongueMax] = jscad.measurements.measureBoundingBox(tongue)
  // PCB-side solder tails share the gold material and sit below the tongue.
  const gold = readGlbGoldContactMesh({ componentName, glb })
  const contacts = jscad.geometries.geom3.fromPoints(
    gold.polygons
      .filter(({ vertices }) => vertices.every((vertex) => vertex[2] > tongueMin[2]))
      .map(({ vertices }) => vertices),
  )
  const [contactMin, contactMax] = jscad.measurements.measureBoundingBox(contacts)
  const contactsAtTongueHeight = jscad.transforms.translateZ(
    (tongueMin[2] + tongueMax[2] - contactMin[2] - contactMax[2]) / 2,
    contacts,
  )
  expect(jscad.measurements.measureVolume(contacts)).toBeGreaterThan(0)
  expect(
    jscad.measurements.measureVolume(jscad.booleans.subtract(contactsAtTongueHeight, tongue)),
  ).toBeCloseTo(0, 5)
})
