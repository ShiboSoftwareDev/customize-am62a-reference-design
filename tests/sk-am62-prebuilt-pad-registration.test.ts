import { test } from "bun:test"
import { expectPrebuiltPadRegistration } from "./fixtures/expect-prebuilt-pad-registration"

test("SK-AM62 leaded packages register to their own pads in every variant", async () => {
  await expectPrebuiltPadRegistration({
    evmId: "sk-am62",
    components: [
      { componentName: "J12", pinCount: 4 },
      { componentName: "J5", pinCount: 19 },
      { componentName: "U108", pinCount: 14 },
      { componentName: "U100", pinCount: 14 },
      { componentName: "U17", pinCount: 16 },
      { componentName: "U63", pinCount: 16 },
      { componentName: "U50", pinCount: 24 },
      { componentName: "U58", pinCount: 5 },
    ],
  })
})
