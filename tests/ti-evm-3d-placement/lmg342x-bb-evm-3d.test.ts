import { test } from "bun:test"
import { expectFullBoard3dSnapshot } from "../fixtures/expect-full-board-3d-snapshot"
import { expectImportedCadPlacementToMatchSource } from "../fixtures/expect-imported-cad-placement-to-match-source"

test("LMG342X-BB-EVM full-board 3D placement", async () => {
  await expectImportedCadPlacementToMatchSource({ evmId: "lmg342x-bb-evm" })
  await expectFullBoard3dSnapshot({ evmId: "lmg342x-bb-evm" })
})
