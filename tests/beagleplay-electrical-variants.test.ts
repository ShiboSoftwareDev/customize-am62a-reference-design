import { test } from "bun:test"
import { expectElectricallyValidVariants } from "./fixtures/expect-electrically-valid-variants"

test("BeaglePlay variants retain the Sitara processor", async () => {
  await expectElectricallyValidVariants({
    evmId: "beagleplay",
    requiredComponentNames: ["U1"],
  })
}, 360_000)
