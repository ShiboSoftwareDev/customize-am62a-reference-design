import { expect, test } from "bun:test"
import { boardPresets } from "lib/board-presets"
import { getSelectionCacheKey, optionalModuleGroups } from "lib/module-config"

test("defines ten unique and complete prebuilt configurations", () => {
  const presetIds = boardPresets.map(({ id }) => id)
  const selectionCacheKeys = boardPresets.map(({ selection }) =>
    getSelectionCacheKey({ selection, addPours: false }),
  )

  expect(boardPresets).toHaveLength(10)
  expect(new Set(presetIds).size).toBe(10)
  expect(new Set(selectionCacheKeys).size).toBe(10)
  for (const preset of boardPresets) {
    expect(Object.keys(preset.selection).sort()).toEqual(
      optionalModuleGroups.map(({ id }) => id).sort(),
    )
  }
})
