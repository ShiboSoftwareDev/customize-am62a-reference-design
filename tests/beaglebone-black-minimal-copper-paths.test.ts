import { test } from "bun:test"
import { expectMinimalCopperPaths } from "./fixtures/expect-minimal-copper-paths"

test("beaglebone-black Minimal keeps copper paths to the original supply and ground", async () => {
  await expectMinimalCopperPaths({
    evmId: "beaglebone-black",
    connectedPinsByNetName: {
      DGND: ["TP8.1", "P10.9", "C36.2", "C84.2", "R25.2"],
      SYS_5V: ["U2.22", "C34.1", "U8.2", "U8.3"],
    },
  })
}, 120_000)
