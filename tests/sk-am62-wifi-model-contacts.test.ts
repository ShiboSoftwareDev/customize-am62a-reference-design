import { expect, test } from "bun:test"
import { readGlbGoldContactMesh } from "./fixtures/read-glb-gold-contact-mesh"
import { getMeshContactCenters } from "./fixtures/get-mesh-contact-centers"
import {
  findMissingPackageContacts,
  readPrebuiltPackageReview,
} from "./fixtures/read-prebuilt-package-review"

test("SK-AM62 WL1837MOD has all 100 contacts at its imported lands", async () => {
  const review = await readPrebuiltPackageReview("sk-am62")
  const board = review.circuitJson.find((element) => element.type === "pcb_board")
  if (typeof board?.thickness !== "number") throw new Error("Missing board thickness")
  const contacts = readGlbGoldContactMesh({ componentName: "MOD1", glb: review.glb })
  expect(getMeshContactCenters({ mesh: contacts, surfaceZ: board.thickness / 2 })).toHaveLength(100)
  expect(findMissingPackageContacts({ componentName: "MOD1", review })).toEqual([])
})
