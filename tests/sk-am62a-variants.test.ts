import { expect, test } from "bun:test"
import { optionalModuleGroups } from "lib/module-config"
import { skAm62aLp } from "lib/ti-evm-catalog"

test("SK-AM62A-LP variants retain complete parameter selections", () => {
  expect(skAm62aLp.variants).toHaveLength(5)
  const optionalModuleIds = optionalModuleGroups.map(({ id }) => id).sort()

  for (const variant of skAm62aLp.variants) {
    expect(variant.sourceSelection).toBeDefined()
    expect(Object.keys(variant.sourceSelection ?? {}).sort()).toEqual(optionalModuleIds)
  }
})
