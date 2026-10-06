import { test } from "bun:test"
import { expectFullBoard3dSnapshot } from "../fixtures/expect-full-board-3d-snapshot"

test("LM251772EVM-PD full-board 3D placement", async () => {
  await expectFullBoard3dSnapshot({ evmId: "lm251772evm-pd" })
})
