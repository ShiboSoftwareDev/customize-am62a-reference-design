import { test } from "bun:test"
import { expectPrebuiltCadModels } from "./fixtures/expect-prebuilt-cad-models"

test("TMDS62LEVM full board retains its Altium CAD representation", async () => {
  await expectPrebuiltCadModels("tmds62levm")
})
