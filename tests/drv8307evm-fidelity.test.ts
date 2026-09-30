import { test } from "bun:test"
import { expectReferenceEvmFidelity } from "tests/fixtures/expect-reference-evm-fidelity"

test("DRV8307EVM preserves geometry and connectivity", async () => {
  await expectReferenceEvmFidelity({ evmId: "drv8307evm" })
})
