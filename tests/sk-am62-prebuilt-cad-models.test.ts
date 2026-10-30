import { test } from "bun:test"
import { expectPrebuiltCadModels } from "./fixtures/expect-prebuilt-cad-models"

test("SK-AM62 full board retains its Altium CAD representation", async () => {
  await expectPrebuiltCadModels("sk-am62")
})
