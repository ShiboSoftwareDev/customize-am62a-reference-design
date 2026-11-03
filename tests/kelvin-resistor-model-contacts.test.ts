import { expect, test } from "bun:test"
import {
  findMissingPackageContacts,
  readPrebuiltPackageReview,
} from "./fixtures/read-prebuilt-package-review"

test("KRL3216 current-sense models meet their four source lands", async () => {
  const review = await readPrebuiltPackageReview("sk-am62")
  for (const componentName of ["R48", "R70", "R106", "R123", "R134", "R148"])
    expect(findMissingPackageContacts({ componentName, review })).toEqual([])
})
