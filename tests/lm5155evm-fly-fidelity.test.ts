import { test } from "bun:test"
import { expectReferenceEvmFidelity } from "tests/fixtures/expect-reference-evm-fidelity"

test("LM5155EVM-FLY preserves geometry and connectivity", async () => {
  await expectReferenceEvmFidelity({ evmId: "lm5155evm-fly" })
})
