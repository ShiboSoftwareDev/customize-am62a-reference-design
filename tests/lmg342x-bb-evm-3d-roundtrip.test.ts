import { test } from "bun:test"
import { expectTiEvm3dRoundtrip } from "tests/fixtures/expect-ti-evm-3d-roundtrip"

test("LMG342X-BB-EVM source and generated 3D", async () => {
  await expectTiEvm3dRoundtrip({
    evmId: "lmg342x-bb-evm",
    testPath: import.meta.path,
  })
}, 40_000)
