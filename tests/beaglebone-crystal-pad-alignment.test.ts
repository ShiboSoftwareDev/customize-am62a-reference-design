import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import {
  findMissingPackageContacts,
  readPrebuiltPackageReview,
} from "./fixtures/read-prebuilt-package-review"
import { isPointInsideMeshSection } from "./fixtures/is-point-inside-mesh-section"

test("BeagleBone crystals have the reference body dimensions and follow their pad axes", async () => {
  const review = await readPrebuiltPackageReview("beaglebone-black")
  for (const { name, dimensions, height } of [
    { name: "Y1", dimensions: [3.7, 7.9], height: 2.5 },
    { name: "Y2", dimensions: [5, 3.2], height: 1.35 },
    { name: "Y3", dimensions: [5, 3.2], height: 1.3 },
  ]) {
    const body = readGlbComponentMesh({
      componentName: name,
      glb: review.glb,
      materialColorFilter: (color) => Boolean(color && Math.max(...color.slice(0, 3)) < 0.3),
    })
    const bodySize = jscad.measurements.measureDimensions(body)
    expect(bodySize[0], name).toBeCloseTo(dimensions[0]!, 3)
    expect(bodySize[1], name).toBeCloseTo(dimensions[1]!, 3)
    const mesh = readGlbComponentMesh({ componentName: name, glb: review.glb })
    expect(jscad.measurements.measureDimensions(mesh)[2], name).toBeCloseTo(height, 3)
    expect(findMissingPackageContacts({ componentName: name, review })).toEqual([])
  }
  const crystal = readGlbComponentMesh({ componentName: "Y2", glb: review.glb })
  const resistor = readGlbComponentMesh({ componentName: "R17", glb: review.glb })
  // This point was inside both old models. R17 remains in its imported position.
  const point: [number, number, number] = [418.6508725714286, 304.288287, -0.98557]
  expect(isPointInsideMeshSection({ point, mesh: resistor })).toBe(true)
  expect(isPointInsideMeshSection({ point, mesh: crystal })).toBe(false)
})
