import { test } from "bun:test"
import { expectPrebuiltIcLeadContacts } from "./fixtures/expect-prebuilt-ic-lead-contacts"

test("BeaglePlay IC leads contact their pads in every configuration", async () => {
  await expectPrebuiltIcLeadContacts({ evmId: "beagleplay", componentNames: ["U10", "U18"] })
})
