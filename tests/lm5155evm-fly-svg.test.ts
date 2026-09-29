import { test } from "bun:test"
import { expectFullBoardSvgSnapshots } from "tests/fixtures/expect-full-board-svg-snapshots"

test("LM5155EVM-FLY full-board PCB and schematic", async () => {
  await expectFullBoardSvgSnapshots({
    evmId: "lm5155evm-fly",
    testPath: import.meta.path,
  })
})
