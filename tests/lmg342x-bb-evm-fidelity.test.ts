import { test } from "bun:test"
import { expectReferenceEvmFidelity } from "tests/fixtures/expect-reference-evm-fidelity"

test("LMG342X-BB-EVM preserves geometry and connectivity", async () => {
  await expectReferenceEvmFidelity({ evmId: "lmg342x-bb-evm" })
})
