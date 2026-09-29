import { expect, test } from "bun:test"
import { allOptionalModules, getSelectionCacheKey } from "lib/module-config"

test("selection cache key includes copper-pour state", () => {
  const withoutPours = getSelectionCacheKey({ selection: allOptionalModules, addPours: false })
  const withPours = getSelectionCacheKey({ selection: allOptionalModules, addPours: true })

  expect(withPours).not.toBe(withoutPours)
})
