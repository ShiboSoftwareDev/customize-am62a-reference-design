import { test } from "bun:test"
import { expectPrebuiltPadRegistration } from "./fixtures/expect-prebuilt-pad-registration"
import { sitaraPadRegistrationComponents } from "./fixtures/sitara-pad-registration-components"

test("TMDS62LEVM without-expansion leaded models register to their own pads", async () => {
  await expectPrebuiltPadRegistration({
    evmId: "tmds62levm",
    variantId: "without-expansion",
    components: sitaraPadRegistrationComponents["tmds62levm"],
  })
})
