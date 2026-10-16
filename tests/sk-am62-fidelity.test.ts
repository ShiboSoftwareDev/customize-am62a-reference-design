import { test } from "bun:test"
import { expectReferenceEvmFidelity } from "tests/fixtures/expect-reference-evm-fidelity"

test("SK-AM62 preserves geometry and connectivity", async () => {
  await expectReferenceEvmFidelity({ evmId: "sk-am62" })
}, 120_000)
