import { test } from "bun:test"
import { expectReferenceEvmFidelity } from "tests/fixtures/expect-reference-evm-fidelity"

test("TMDS62LEVM preserves geometry and connectivity", async () => {
  await expectReferenceEvmFidelity({ evmId: "tmds62levm" })
}, 120_000)
