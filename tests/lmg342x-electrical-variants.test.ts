import { setDefaultTimeout, test } from "bun:test"
import { expectElectricallyValidVariants } from "./fixtures/expect-electrically-valid-variants"

setDefaultTimeout(15_000)

test("LMG342X variants retain PWM, bias, power, and cooling paths", async () => {
  await expectElectricallyValidVariants({
    evmId: "lmg342x-bb-evm",
    requiredComponentNames: ["J1", "J3", "J7", "J8", "J9", "J10", "J11", "J13", "J14", "J15"],
  })
})
