import { test } from "bun:test"
import { expectFullBoard3dSnapshot } from "../fixtures/expect-full-board-3d-snapshot"
import { expectImportedCadPlacementToMatchSource } from "../fixtures/expect-imported-cad-placement-to-match-source"

test("DP83825EVM full-board 3D placement", async () => {
  await expectImportedCadPlacementToMatchSource({ evmId: "dp83825evm" })
  await expectFullBoard3dSnapshot({ evmId: "dp83825evm" })
})
