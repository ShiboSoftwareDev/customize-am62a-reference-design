import { test } from "bun:test"
import { expectFullBoardSvgSnapshots } from "tests/fixtures/expect-full-board-svg-snapshots"

test("LM251772EVM-PD full-board PCB and schematic", async () => {
  await expectFullBoardSvgSnapshots({
    evmId: "lm251772evm-pd",
    testPath: import.meta.path,
  })
})
