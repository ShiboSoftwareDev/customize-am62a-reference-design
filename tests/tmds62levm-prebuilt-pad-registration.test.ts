import { test } from "bun:test"
import { expectPrebuiltPadRegistration } from "./fixtures/expect-prebuilt-pad-registration"

test("TMDS62LEVM leaded packages register to their own pads in every variant", async () => {
  await expectPrebuiltPadRegistration({
    evmId: "tmds62levm",
    components: [
      { componentName: "J4", pinCount: 75, expectedPadCount: 67 },
      { componentName: "U82", pinCount: 16 },
      { componentName: "U73", pinCount: 16 },
      { componentName: "U21", pinCount: 16 },
      { componentName: "U103", pinCount: 24 },
      { componentName: "U30", pinCount: 56 },
      { componentName: "U102", pinCount: 56 },
      { componentName: "U94", pinCount: 5 },
      { componentName: "U45", pinCount: 10 },
      { componentName: "U106", pinCount: 10 },
      { componentName: "U65", pinCount: 5 },
    ],
  })
})
