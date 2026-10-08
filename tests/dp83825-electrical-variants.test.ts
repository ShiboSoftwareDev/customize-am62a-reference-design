import { test } from "bun:test"
import { expectElectricallyValidVariants } from "./fixtures/expect-electrically-valid-variants"

test("DP83825 variants retain valid management and Ethernet paths", async () => {
  await expectElectricallyValidVariants({
    evmId: "dp83825evm",
    requiredComponentNames: ["U3", "J9", "J10", "J11", "XTAL1"],
  })
})
