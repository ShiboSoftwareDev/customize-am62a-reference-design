import { expect, test } from "bun:test"
import jscad from "@jscad/modeling"
import { readGlbComponentMesh } from "./fixtures/read-glb-component-mesh"
import {
  findMissingPackageContacts,
  readPrebuiltPackageReview,
} from "./fixtures/read-prebuilt-package-review"
import { getMeshContactCenters } from "./fixtures/get-mesh-contact-centers"

function isKmr2TerminalColor(color: number[] | undefined): boolean {
  return Boolean(color && color[0]! > 0.5 && color[1]! > 0.4 && color[2]! < 0.4)
}

test("BeagleBone Black's KMR231 switches use the manufacturer's miniature case and landed leads", async () => {
  const review = await readPrebuiltPackageReview("beaglebone-black")
  const board = review.circuitJson.find((element) => element.type === "pcb_board")
  if (typeof board?.thickness !== "number") throw new Error("Missing board thickness")
  for (const componentName of ["S1", "S2", "S3"]) {
    const mesh = readGlbComponentMesh({ componentName, glb: review.glb })
    const dimensions = jscad.measurements.measureDimensions(mesh)
    expect(dimensions[0]).toBeCloseTo(4.6, 3)
    expect(dimensions[1]).toBeCloseTo(2.8, 3)
    expect(dimensions[2]).toBeCloseTo(1.9, 3)
    const terminals = readGlbComponentMesh({
      componentName,
      glb: review.glb,
      materialColorFilter: isKmr2TerminalColor,
    })
    expect(getMeshContactCenters({ mesh: terminals, surfaceZ: board.thickness / 2 })).toHaveLength(
      4,
    )
    expect(
      findMissingPackageContacts({
        componentName,
        review,
        materialColorFilter: isKmr2TerminalColor,
      }),
    ).toEqual([])
  }
})
