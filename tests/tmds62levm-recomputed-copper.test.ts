import { test } from "bun:test"
import { expectRecomputedCopperPours } from "./fixtures/expect-recomputed-copper-pours"

test("TMDS62LEVM variants recompute all copper layers and refill removed pad voids", async () => {
  await expectRecomputedCopperPours({ evmId: "tmds62levm", testPath: import.meta.path })
}, 120_000)
