import { test } from "bun:test"
import { expectFullBoard3dSnapshot } from "../fixtures/expect-full-board-3d-snapshot"
import { expectImportedCadPlacementToMatchSource } from "../fixtures/expect-imported-cad-placement-to-match-source"

test("LM251772EVM-PD full-board 3D placement", async () => {
  await expectImportedCadPlacementToMatchSource({
    evmId: "lm251772evm-pd",
  })
  await expectFullBoard3dSnapshot({ evmId: "lm251772evm-pd" })
})
