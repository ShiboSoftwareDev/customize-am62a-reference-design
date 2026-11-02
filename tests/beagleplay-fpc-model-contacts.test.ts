import { test } from "bun:test"
import { expectPrebuiltFpcContacts } from "./fixtures/expect-prebuilt-fpc-contacts"

test("BeaglePlay FPC models have distinct solder tails on every imported land", async () => {
  await expectPrebuiltFpcContacts({
    boardId: "beagleplay",
    packages: [
      { componentName: "J8", contactCount: 42 },
      { componentName: "J17", contactCount: 24 },
    ],
  })
})
