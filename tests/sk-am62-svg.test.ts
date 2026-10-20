import { test } from "bun:test"
import { expectFullBoardSvgSnapshots } from "tests/fixtures/expect-full-board-svg-snapshots"

test("SK-AM62 full-board PCB and schematic", async () => {
  await expectFullBoardSvgSnapshots({
    evmId: "sk-am62",
    testPath: import.meta.path,
  })
}, 120_000)
