import { test } from "bun:test"
import { expectFullBoard3dSnapshot } from "../fixtures/expect-full-board-3d-snapshot"

test("DRV8307EVM full-board 3D placement", async () => {
  await expectFullBoard3dSnapshot({ evmId: "drv8307evm" })
})
