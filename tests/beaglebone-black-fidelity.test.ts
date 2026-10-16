import { test } from "bun:test"
import { expectReferenceEvmFidelity } from "tests/fixtures/expect-reference-evm-fidelity"

test("BeagleBone Black preserves geometry and connectivity", async () => {
  await expectReferenceEvmFidelity({ evmId: "beaglebone-black" })
}, 120_000)
