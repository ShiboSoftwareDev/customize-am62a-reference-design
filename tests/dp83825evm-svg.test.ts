import { test } from "bun:test"
import { expectFullBoardSvgSnapshots } from "tests/fixtures/expect-full-board-svg-snapshots"

test("DP83825EVM full-board PCB and schematic", async () => {
  await expectFullBoardSvgSnapshots({
    evmId: "dp83825evm",
    testPath: import.meta.path,
  })
})
