import { test } from "bun:test"
import { expectPrebuiltPadRegistration } from "./fixtures/expect-prebuilt-pad-registration"
import { sitaraPadRegistrationComponents } from "./fixtures/sitara-pad-registration-components"

test("TMDS62LEVM without-connectivity leaded models register to their own pads", async () => {
  await expectPrebuiltPadRegistration({
    evmId: "tmds62levm",
    variantId: "without-connectivity",
    components: sitaraPadRegistrationComponents["tmds62levm"],
  })
})
