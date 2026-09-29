import { test } from "bun:test"
import { expectFullBoardSvgSnapshots } from "tests/fixtures/expect-full-board-svg-snapshots"

test("BQ25731EVM full-board PCB and schematic", async () => {
  await expectFullBoardSvgSnapshots({
    evmId: "bq25731evm",
    testPath: import.meta.path,
  })
})
