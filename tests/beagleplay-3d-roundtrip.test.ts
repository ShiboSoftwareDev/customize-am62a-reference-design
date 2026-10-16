import { test } from "bun:test"
import { expectTiEvm3dRoundtrip } from "tests/fixtures/expect-ti-evm-3d-roundtrip"

test("BeaglePlay source and generated 3D", async () => {
  await expectTiEvm3dRoundtrip({
    evmId: "beagleplay",
    testPath: import.meta.path,
  })
}, 120_000)
