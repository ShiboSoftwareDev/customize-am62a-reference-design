import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { getMeshContactCenters } from "./fixtures/get-mesh-contact-centers"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import {
  findMissingPackageContacts,
  readPrebuiltPackageReview,
} from "./fixtures/read-prebuilt-package-review"

function isElectrodeMaterial(color: number[] | undefined): boolean {
  return Boolean(color && Math.min(...color.slice(0, 3)) > 0.73)
}

test("TMDS62LEVM NFM15CC filters have four separate contacts on their lands", async () => {
  const review = await readPrebuiltPackageReview("tmds62levm")
  const board = review.circuitJson.find((element) => element.type === "pcb_board")
  if (typeof board?.thickness !== "number") throw new Error("Missing board thickness")

  const filters = Object.entries(review.footprints)
    .filter(([, footprint]) => footprint === "EMIFIL_NFM15CC_0402_0-5_TI")
    .map(([name]) => name)
  expect(filters).toContain("U19")
  for (const componentName of filters) {
    const metal = readGlbComponentMesh({
      componentName,
      glb: review.glb,
      materialColorFilter: isElectrodeMaterial,
    })
    expect(getMeshContactCenters({ mesh: metal, surfaceZ: board.thickness / 2 })).toHaveLength(4)
    expect(
      findMissingPackageContacts({
        componentName,
        review,
        materialColorFilter: isElectrodeMaterial,
      }),
    ).toEqual([])

    const body = readGlbComponentMesh({ componentName, glb: review.glb })
    const [width, length, height] = jscad.measurements.measureDimensions(body)
    expect(Math.max(width, length)).toBeCloseTo(1, 3)
    expect(Math.min(width, length)).toBeCloseTo(0.5, 3)
    expect(height).toBeCloseTo(0.4, 3)
  }
})
