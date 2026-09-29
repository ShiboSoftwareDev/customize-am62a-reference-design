import { test } from "bun:test"
import { expectFullBoardSvgSnapshots } from "tests/fixtures/expect-full-board-svg-snapshots"

test("DRV8210EVM full-board PCB and schematic", async () => {
  await expectFullBoardSvgSnapshots({
    evmId: "drv8210evm",
    testPath: import.meta.path,
  })
})
