import { expect, test } from "bun:test"
import { normalizeRenderRequest } from "lib/server/normalize-render-request"

test("render request accepts known booleans and applies safe defaults", () => {
  const request = normalizeRenderRequest({
    selection: { ethernet: false, camera: false },
    addPours: "yes",
  })

  expect(request.selection.ethernet).toBe(false)
  expect(request.selection.camera).toBe(false)
  expect(request.selection.storage).toBe(true)
  expect(request.addPours).toBe(false)
})
