import { setDefaultTimeout, test } from "bun:test"
import { expectElectricallyValidVariants } from "./fixtures/expect-electrically-valid-variants"

setDefaultTimeout(15_000)

test("LM251772 variants retain the complete buck-boost power path", async () => {
  await expectElectricallyValidVariants({
    evmId: "lm251772evm-pd",
    requiredComponentNames: ["U1", "J1", "J2", "J5", "J6", "JP1", "JP12"],
  })
})
