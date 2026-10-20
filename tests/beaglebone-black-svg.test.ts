import { test } from "bun:test"
import { expectFullBoardSvgSnapshots } from "tests/fixtures/expect-full-board-svg-snapshots"

test("BeagleBone Black full-board PCB and schematic", async () => {
  await expectFullBoardSvgSnapshots({
    evmId: "beaglebone-black",
    testPath: import.meta.path,
  })
}, 120_000)
