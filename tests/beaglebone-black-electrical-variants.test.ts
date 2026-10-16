import { test } from "bun:test"
import { expectElectricallyValidVariants } from "./fixtures/expect-electrically-valid-variants"

test("BeagleBone Black variants retain the Sitara processor", async () => {
  await expectElectricallyValidVariants({
    evmId: "beaglebone-black",
    requiredComponentNames: ["U5"],
  })
}, 120_000)
