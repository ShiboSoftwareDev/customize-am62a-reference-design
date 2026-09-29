import { test } from "bun:test"
import { expectFullBoardSvgSnapshots } from "tests/fixtures/expect-full-board-svg-snapshots"

test("DRV8307EVM full-board PCB and schematic", async () => {
  await expectFullBoardSvgSnapshots({
    evmId: "drv8307evm",
    testPath: import.meta.path,
  })
})
