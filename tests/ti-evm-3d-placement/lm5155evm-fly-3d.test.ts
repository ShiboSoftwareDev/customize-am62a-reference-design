import { test } from "bun:test"
import { expectFullBoard3dSnapshot } from "../fixtures/expect-full-board-3d-snapshot"
import { expectImportedCadPlacementToMatchSource } from "../fixtures/expect-imported-cad-placement-to-match-source"

test("LM5155EVM-FLY full-board 3D placement", async () => {
  await expectImportedCadPlacementToMatchSource({ evmId: "lm5155evm-fly" })
  await expectFullBoard3dSnapshot({ evmId: "lm5155evm-fly" })
})
