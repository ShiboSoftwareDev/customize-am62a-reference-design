import { expect } from "bun:test"
import {
  findMissingPackageContacts,
  readPrebuiltPackageReview,
} from "./read-prebuilt-package-review"
import { readGlbComponentMesh } from "./read-glb-component-mesh"
import { getMeshContactCenters } from "./get-mesh-contact-centers"

export async function expectPrebuiltFpcContacts({
  boardId,
  packages,
}: {
  boardId: string
  packages: Array<{ componentName: string; contactCount: number }>
}) {
  const review = await readPrebuiltPackageReview(boardId)
  const board = review.circuitJson.find((element) => element.type === "pcb_board")
  if (typeof board?.thickness !== "number") throw new Error("Missing board thickness")
  for (const { componentName, contactCount } of packages) {
    const source = review.circuitJson.find(
      (element) => element.type === "source_component" && element.name === componentName,
    )
    const component = review.circuitJson.find(
      (element) =>
        element.type === "pcb_component" &&
        element.source_component_id === source?.source_component_id,
    )
    if (!component) throw new Error(`Missing ${componentName}`)
    const surfaceZ = ((component.layer === "bottom" ? -1 : 1) * board.thickness) / 2
    const contacts = readGlbComponentMesh({
      componentName,
      glb: review.glb,
      surfaceZ,
      materialColorFilter: (color) => Boolean(color && Math.min(...color.slice(0, 3)) > 0.5),
    })
    expect(getMeshContactCenters({ mesh: contacts, surfaceZ }), componentName).toHaveLength(
      contactCount,
    )
    expect(findMissingPackageContacts({ componentName, review }), componentName).toEqual([])
  }
}
