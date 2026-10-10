import { test } from "bun:test"
import { expectTiEvm3dRoundtrip } from "tests/fixtures/expect-ti-evm-3d-roundtrip"

test("DRV8307EVM source and generated 3D", async () => {
  await expectTiEvm3dRoundtrip({
    evmId: "drv8307evm",
    testPath: import.meta.path,
  })
}, 40_000)
