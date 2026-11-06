import { test } from "bun:test"
import { expectMinimalCopperPaths } from "./fixtures/expect-minimal-copper-paths"

test("tmds62levm Minimal keeps copper paths to the original supply and ground", async () => {
  await expectMinimalCopperPaths({
    evmId: "tmds62levm",
    connectedPinsByNetName: {
      VCC_3V3_MAIN: ["R252.1", "U132.5", "C493.1"],
      VCC1V8_SYS: ["U50.2", "U70.3", "C230.2"],
      VCC_3V3_SYS: ["R141.2", "R1.2", "R577.2"],
    },
  })
}, 120_000)
