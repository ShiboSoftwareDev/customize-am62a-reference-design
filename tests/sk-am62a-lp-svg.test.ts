import { test } from "bun:test"
import { expectFullBoardSvgSnapshots } from "tests/fixtures/expect-full-board-svg-snapshots"

test("SK-AM62A-LP full-board PCB and schematic", async () => {
  await expectFullBoardSvgSnapshots({
    evmId: "sk-am62a-lp",
    testPath: import.meta.path,
  })
})
