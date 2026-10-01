import { test } from "bun:test"
import { expectReferenceEvmFidelity } from "tests/fixtures/expect-reference-evm-fidelity"

test("LM251772EVM-PD preserves geometry and connectivity", async () => {
  await expectReferenceEvmFidelity({ evmId: "lm251772evm-pd" })
})
