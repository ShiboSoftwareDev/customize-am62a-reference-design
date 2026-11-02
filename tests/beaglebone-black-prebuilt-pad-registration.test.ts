import { test } from "bun:test"
import { expectPrebuiltPadRegistration } from "./fixtures/expect-prebuilt-pad-registration"

test("BeagleBone Black leaded packages register to their own pads in every variant", async () => {
  await expectPrebuiltPadRegistration({
    evmId: "beaglebone-black",
    components: [
      { componentName: "D6", pinCount: 10 },
      { componentName: "D7", pinCount: 10 },
      { componentName: "U3", pinCount: 5 },
      { componentName: "U7", pinCount: 5 },
      { componentName: "U6", pinCount: 8 },
      { componentName: "U8", pinCount: 8 },
      { componentName: "U15", pinCount: 8 },
    ],
  })
})
