import { expect, test } from "bun:test"
import { tiEvms } from "lib/ti-evm-catalog"

test("catalog exposes five real TI EVM product references", () => {
  expect(tiEvms.map(({ name }) => name)).toEqual([
    "SK-AM62A-LP",
    "BQ25731EVM",
    "DRV8210EVM",
    "LMK1C1104EVM",
    "TPS62933PEVM",
  ])
  for (const evm of tiEvms) {
    expect(evm.sourceUrl).toStartWith("https://www.ti.com/tool/")
    expect(evm.variants.length).toBeGreaterThanOrEqual(4)
    expect(evm.variants.length).toBe(1 << evm.removableFeatures.length)
    expect(new Set(evm.variants.map(({ circuitJsonUrl }) => circuitJsonUrl)).size).toBe(
      evm.variants.length,
    )
  }
})
