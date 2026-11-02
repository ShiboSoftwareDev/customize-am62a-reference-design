import { test } from "bun:test"
import { expectPrebuiltPadRegistration } from "./fixtures/expect-prebuilt-pad-registration"
import { sitaraPadRegistrationComponents } from "./fixtures/sitara-pad-registration-components"

test("SK-AM62 without-connectivity leaded models register to their own pads", async () => {
  await expectPrebuiltPadRegistration({
    evmId: "sk-am62",
    variantId: "without-connectivity",
    components: sitaraPadRegistrationComponents["sk-am62"],
  })
})
