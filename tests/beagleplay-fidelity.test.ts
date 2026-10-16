import { test } from "bun:test"
import { expectReferenceEvmFidelity } from "tests/fixtures/expect-reference-evm-fidelity"

test("BeaglePlay preserves geometry and connectivity", async () => {
  await expectReferenceEvmFidelity({ evmId: "beagleplay" })
}, 120_000)
