import { test } from "bun:test"
import { expectPcbRenderCompletion } from "./fixtures/expect-pcb-render-completion"

test("a revisited cached PCB waits for its new frame", async () => {
  await expectPcbRenderCompletion("cached")
})
