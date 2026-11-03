import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import { readGlbGoldContactMesh } from "./fixtures/read-glb-gold-contact-mesh"
import { readPrebuiltPackageReview } from "./fixtures/read-prebuilt-package-review"

test("SK-AM62 U29 encloses its 96-ball grid along the package's long axis", async () => {
  const review = await readPrebuiltPackageReview("sk-am62")
  const body = readGlbComponentMesh({
    componentName: "U29",
    glb: review.glb,
    materialColorFilter: (color) => Boolean(color && Math.max(...color.slice(0, 3)) < 0.25),
  })
  const balls = readGlbGoldContactMesh({ componentName: "U29", glb: review.glb })
  const bodyBounds = jscad.measurements.measureBoundingBox(body)
  const ballBounds = jscad.measurements.measureBoundingBox(balls)
  expect(bodyBounds[1][1] - bodyBounds[0][1]).toBeGreaterThan(bodyBounds[1][0] - bodyBounds[0][0])
  for (const axis of [0, 1] as const) {
    expect(ballBounds[0][axis]).toBeGreaterThan(bodyBounds[0][axis])
    expect(ballBounds[1][axis]).toBeLessThan(bodyBounds[1][axis])
  }
})
