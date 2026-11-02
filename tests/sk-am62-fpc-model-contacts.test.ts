import { test } from "bun:test"
import { expectPrebuiltFpcContacts } from "./fixtures/expect-prebuilt-fpc-contacts"

test("SK-AM62 FPC models have distinct solder tails on every imported land", async () => {
  await expectPrebuiltFpcContacts({
    boardId: "sk-am62",
    packages: [
      { componentName: "J19", contactCount: 30 },
      { componentName: "J21", contactCount: 44 },
      { componentName: "J23", contactCount: 42 },
    ],
  })
})
