import { test } from "bun:test"
import { expectRecomputedCopperPours } from "./fixtures/expect-recomputed-copper-pours"

test("BeaglePlay variants recompute all copper layers and refill removed pad voids", async () => {
  await expectRecomputedCopperPours({ evmId: "beagleplay", testPath: import.meta.path })
}, 120_000)
