import { test } from "bun:test"
import { expectFullBoardSvgSnapshots } from "tests/fixtures/expect-full-board-svg-snapshots"

test("TMDS62LEVM full-board PCB and schematic", async () => {
  await expectFullBoardSvgSnapshots({
    evmId: "tmds62levm",
    testPath: import.meta.path,
  })
}, 120_000)
