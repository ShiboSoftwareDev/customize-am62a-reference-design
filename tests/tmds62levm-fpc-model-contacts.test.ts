import { test } from "bun:test"
import { expectPrebuiltFpcContacts } from "./fixtures/expect-prebuilt-fpc-contacts"

test("TMDS62LEVM's vertical FPC model has a solder tail on every imported land", async () => {
  await expectPrebuiltFpcContacts({
    boardId: "tmds62levm",
    packages: [{ componentName: "J23", contactCount: 26 }],
  })
})
