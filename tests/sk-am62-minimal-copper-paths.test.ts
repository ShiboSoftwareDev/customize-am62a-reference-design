import { test } from "bun:test"
import { expectMinimalCopperPaths } from "./fixtures/expect-minimal-copper-paths"

test("sk-am62 Minimal keeps copper paths to the original supply and ground", async () => {
  await expectMinimalCopperPaths({
    evmId: "sk-am62",
    connectedPinsByNetName: {
      VCC3V3_TA: ["R585.2", "U43.VCC", "C167.1"],
      VCC_3V3_SYS: ["R578.2", "R144.2", "R461.1", "R490.1", "R491.1"],
    },
  })
}, 120_000)
