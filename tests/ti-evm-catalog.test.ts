import { expect, test } from "bun:test"
import { optionalModuleGroups } from "lib/module-config"
import { skAm62aLp } from "lib/ti-evm-catalog"

test("catalog exposes only parameterized TSX variants of the SK-AM62A-LP", () => {
  expect(skAm62aLp.id).toBe("sk-am62a-lp")
  expect(skAm62aLp.sourceUrl).toBe("https://www.ti.com/tool/SK-AM62A-LP")
  expect(skAm62aLp.variants).toHaveLength(5)
  expect(
    new Set(skAm62aLp.variants.map(({ sourceSelection }) => JSON.stringify(sourceSelection))).size,
  ).toBe(skAm62aLp.variants.length)

  const optionalModuleIds = optionalModuleGroups.map(({ id }) => id).sort()
  for (const variant of skAm62aLp.variants) {
    expect(Object.keys(variant.sourceSelection).sort()).toEqual(optionalModuleIds)
    expect(variant.circuitJsonUrl.startsWith("/prebuilt-ti-evms/sk-am62a-lp/")).toBe(true)
  }

  expect(JSON.stringify(skAm62aLp).toLowerCase()).not.toContain("altium")
  expect(JSON.stringify(skAm62aLp).toLowerCase()).not.toContain("booster")
})
