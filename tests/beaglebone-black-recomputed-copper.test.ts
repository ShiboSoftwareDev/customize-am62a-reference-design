import { test } from "bun:test"
import { expectRecomputedCopperPours } from "./fixtures/expect-recomputed-copper-pours"

test("BeagleBone Black variants recompute all copper layers and refill removed pad voids", async () => {
  await expectRecomputedCopperPours({ evmId: "beaglebone-black", testPath: import.meta.path })
}, 120_000)
