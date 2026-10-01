import { test } from "bun:test"
import { expectFullBoardSvgSnapshots } from "tests/fixtures/expect-full-board-svg-snapshots"

test("LMG342X-BB-EVM full-board PCB and schematic", async () => {
  await expectFullBoardSvgSnapshots({
    evmId: "lmg342x-bb-evm",
    testPath: import.meta.path,
  })
})
