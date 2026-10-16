import { test } from "bun:test"
import { expectTiEvm3dRoundtrip } from "tests/fixtures/expect-ti-evm-3d-roundtrip"

test("BeagleBone Black source and generated 3D", async () => {
  await expectTiEvm3dRoundtrip({
    evmId: "beaglebone-black",
    testPath: import.meta.path,
  })
}, 120_000)
