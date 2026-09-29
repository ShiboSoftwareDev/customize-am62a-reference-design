import { expect, test } from "bun:test"
import { tiEvms } from "lib/ti-evm-catalog"

test("catalog contains complex source-backed TI EVMs and curated variants", () => {
  expect(tiEvms.map(({ id }) => id)).toEqual(["sk-am62a-lp", "tmds62levm", "am62l-evse-dev-evm"])
  expect(tiEvms.every(({ sourceUrl }) => sourceUrl.startsWith("https://www.ti.com/tool/"))).toBe(
    true,
  )

  const skAm62a = tiEvms[0]
  expect(skAm62a.variants).toHaveLength(5)
  expect(
    new Set(skAm62a.variants.map(({ sourceSelection }) => JSON.stringify(sourceSelection))).size,
  ).toBe(skAm62a.variants.length)

  expect(tiEvms[1].variants[0].schematicPages).toHaveLength(57)
  expect(tiEvms[2].variants[0].schematicPages).toHaveLength(16)
  expect(JSON.stringify(tiEvms).toLowerCase()).not.toContain("booster")
})
