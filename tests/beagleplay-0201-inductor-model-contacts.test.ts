import { expect, test } from "bun:test"
import {
  findMissingPackageContacts,
  readPrebuiltPackageReview,
} from "./fixtures/read-prebuilt-package-review"

test("BeaglePlay's diagonal 0201 inductors put both terminations on their own lands", async () => {
  const review = await readPrebuiltPackageReview("beagleplay")
  for (const componentName of ["L5", "L6", "L7", "L10", "L11"]) {
    expect(findMissingPackageContacts({ componentName, review }), componentName).toEqual([])
  }
})
