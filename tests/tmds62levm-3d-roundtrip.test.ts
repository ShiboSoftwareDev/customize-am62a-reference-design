import { test } from "bun:test"
import { expectTiEvm3dRoundtrip } from "tests/fixtures/expect-ti-evm-3d-roundtrip"

test("TMDS62LEVM source and generated 3D", async () => {
  await expectTiEvm3dRoundtrip({
    evmId: "tmds62levm",
    testPath: import.meta.path,
  })
}, 120_000)
