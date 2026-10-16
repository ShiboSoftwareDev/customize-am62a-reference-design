import { test } from "bun:test"
import { expectElectricallyValidVariants } from "./fixtures/expect-electrically-valid-variants"

test("TMDS62LEVM variants retain the Sitara processor", async () => {
  await expectElectricallyValidVariants({
    evmId: "tmds62levm",
    requiredComponentNames: ["U28"],
  })
}, 120_000)
