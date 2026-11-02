import { test } from "bun:test"
import { expectPrebuiltIcLeadContacts } from "./fixtures/expect-prebuilt-ic-lead-contacts"

test("BeagleBone Black IC leads contact their pads in every configuration", async () => {
  await expectPrebuiltIcLeadContacts({
    evmId: "beaglebone-black",
    componentNames: ["U6", "U8", "U15"],
  })
})
