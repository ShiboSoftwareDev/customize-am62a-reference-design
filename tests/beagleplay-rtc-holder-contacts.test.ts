import { expect, test } from "bun:test"
import { getTiEvm } from "../lib/ti-evm-catalog"
import {
  findMissingPackageContacts,
  readPrebuiltPackageReview,
} from "./fixtures/read-prebuilt-package-review"

test("BeaglePlay J10 has solder terminals on both RTC holder pads", async () => {
  for (const variant of getTiEvm("beagleplay").variants) {
    const review = await readPrebuiltPackageReview("beagleplay", variant.id)
    expect(findMissingPackageContacts({ componentName: "J10", review }), variant.id).toEqual([])
  }
}, 60_000)
