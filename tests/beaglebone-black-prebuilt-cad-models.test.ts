import { test } from "bun:test"
import { expectPrebuiltCadModels } from "./fixtures/expect-prebuilt-cad-models"

test("BeagleBone Black full board retains its Altium CAD representation", async () => {
  await expectPrebuiltCadModels("beaglebone-black")
})
