import { test } from "bun:test"
import { expectFullBoardSvgSnapshots } from "tests/fixtures/expect-full-board-svg-snapshots"

test("LMK1C1104EVM full-board PCB and schematic", async () => {
  await expectFullBoardSvgSnapshots({
    evmId: "lmk1c1104evm",
    testPath: import.meta.path,
  })
})
