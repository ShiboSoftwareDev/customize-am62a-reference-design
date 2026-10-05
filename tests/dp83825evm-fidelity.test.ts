import { test } from "bun:test"
import { expectReferenceEvmFidelity } from "tests/fixtures/expect-reference-evm-fidelity"

test("DP83825EVM preserves geometry and connectivity", async () => {
  await expectReferenceEvmFidelity({ evmId: "dp83825evm" })
})
