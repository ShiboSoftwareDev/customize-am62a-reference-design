import { test } from "bun:test"
import { expectRecomputedCopperPours } from "./fixtures/expect-recomputed-copper-pours"

test("SK-AM62 variants recompute all copper layers and refill removed pad voids", async () => {
  await expectRecomputedCopperPours({ evmId: "sk-am62", testPath: import.meta.path })
}, 120_000)
