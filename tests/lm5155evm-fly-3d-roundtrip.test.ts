import { test } from "bun:test"
import { expectTiEvm3dRoundtrip } from "tests/fixtures/expect-ti-evm-3d-roundtrip"

test("LM5155EVM-FLY source and generated 3D", async () => {
  await expectTiEvm3dRoundtrip({
    evmId: "lm5155evm-fly",
    testPath: import.meta.path,
  })
}, 40_000)
