import { test } from "bun:test"
import { expectFullBoard3dSnapshot } from "../fixtures/expect-full-board-3d-snapshot"

test("LMG342X-BB-EVM full-board 3D placement", async () => {
  await expectFullBoard3dSnapshot({ evmId: "lmg342x-bb-evm" })
})
