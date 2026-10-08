import { test } from "bun:test"
import { expectElectricallyValidVariants } from "./fixtures/expect-electrically-valid-variants"

test("LM5155 variants retain the complete isolated power stage", async () => {
  await expectElectricallyValidVariants({
    evmId: "lm5155evm-fly",
    requiredComponentNames: ["U1", "T1", "J1", "J2"],
  })
})
