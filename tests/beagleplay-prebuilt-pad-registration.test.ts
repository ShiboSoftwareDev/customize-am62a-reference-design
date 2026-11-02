import { test } from "bun:test"
import { expectPrebuiltPadRegistration } from "./fixtures/expect-prebuilt-pad-registration"

test("BeaglePlay leaded packages register to their own pads in every variant", async () => {
  await expectPrebuiltPadRegistration({
    evmId: "beagleplay",
    components: [
      { componentName: "J7", pinCount: 4 },
      { componentName: "U8", pinCount: 6 },
      { componentName: "U21", pinCount: 6 },
      { componentName: "U16", pinCount: 5 },
      { componentName: "U20", pinCount: 5 },
      { componentName: "Q5", pinCount: 3 },
      { componentName: "U18", pinCount: 8 },
      { componentName: "U10", pinCount: 8 },
    ],
  })
})
