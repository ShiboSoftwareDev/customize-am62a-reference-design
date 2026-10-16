import { test } from "bun:test"
import { expectFullBoardSvgSnapshots } from "tests/fixtures/expect-full-board-svg-snapshots"

test("BeaglePlay full-board PCB and schematic", async () => {
  await expectFullBoardSvgSnapshots({
    evmId: "beagleplay",
    testPath: import.meta.path,
  })
}, 120_000)
