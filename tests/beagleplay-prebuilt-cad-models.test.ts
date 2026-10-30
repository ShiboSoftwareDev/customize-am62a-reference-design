import { test } from "bun:test"
import { expectPrebuiltCadModels } from "./fixtures/expect-prebuilt-cad-models"

test("BeaglePlay full board retains its Altium CAD representation", async () => {
  await expectPrebuiltCadModels("beagleplay")
})
