import { expect, test } from "bun:test"
import {
  findMissingPackageContacts,
  readPrebuiltPackageReview,
} from "./fixtures/read-prebuilt-package-review"

test("EXB18V resistor arrays meet all eight lands on both board sides", async () => {
  for (const boardId of ["sk-am62", "tmds62levm"]) {
    const review = await readPrebuiltPackageReview(boardId)
    for (const componentName of ["RA1", "RA2", "RA3", "RA4"])
      expect(findMissingPackageContacts({ componentName, review })).toEqual([])
  }
})
