import { test } from "bun:test"
import { expectTiEvm3dRoundtrip } from "tests/fixtures/expect-ti-evm-3d-roundtrip"

test("SK-AM62 source and generated 3D", async () => {
  await expectTiEvm3dRoundtrip({
    evmId: "sk-am62",
    testPath: import.meta.path,
  })
}, 120_000)
