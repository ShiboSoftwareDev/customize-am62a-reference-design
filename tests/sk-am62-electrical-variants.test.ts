import { test } from "bun:test"
import { expectElectricallyValidVariants } from "./fixtures/expect-electrically-valid-variants"

test("SK-AM62 variants retain the Sitara processor", async () => {
  await expectElectricallyValidVariants({
    evmId: "sk-am62",
    requiredComponentNames: ["U12"],
  })
}, 360_000)
