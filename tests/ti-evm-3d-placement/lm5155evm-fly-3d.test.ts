import { test } from "bun:test"
import { expectFullBoard3dSnapshot } from "../fixtures/expect-full-board-3d-snapshot"

test("LM5155EVM-FLY full-board 3D placement", async () => {
  await expectFullBoard3dSnapshot({ evmId: "lm5155evm-fly" })
})
