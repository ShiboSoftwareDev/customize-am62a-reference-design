import { test } from "bun:test"
import { expectElectricallyValidVariants } from "./fixtures/expect-electrically-valid-variants"

test("DRV8307 variants retain valid motor, Hall, and PWM paths", async () => {
  await expectElectricallyValidVariants({
    evmId: "drv8307evm",
    requiredComponentNames: ["U1", "P1", "P2", "P3", "JP5", "JP6", "JP7"],
  })
})
