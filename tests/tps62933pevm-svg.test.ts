import { test } from "bun:test"
import { expectFullBoardSvgSnapshots } from "tests/fixtures/expect-full-board-svg-snapshots"

test("TPS62933PEVM full-board PCB and schematic", async () => {
  await expectFullBoardSvgSnapshots({
    evmId: "tps62933pevm",
    testPath: import.meta.path,
  })
})
