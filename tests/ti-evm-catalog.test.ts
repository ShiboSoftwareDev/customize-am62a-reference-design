import { expect, test } from "bun:test"
import { tiEvms } from "lib/ti-evm-catalog"

test("catalog exposes five real TI EVM product references", () => {
  expect(tiEvms.map(({ name }) => name)).toEqual([
    "SK-AM62A-LP",
    "DRV8307EVM",
    "LM5155EVM-FLY",
    "LM251772EVM-PD",
    "LMG342X-BB-EVM",
  ])
  for (const evm of tiEvms) {
    expect(evm.sourceUrl).toStartWith("https://www.ti.com/tool/")
    expect(evm.sourcePath).toBe(`boards/${evm.id}/index.circuit.tsx`)
    expect(evm.variants.length).toBeGreaterThanOrEqual(4)
    expect(evm.variants.length).toBe(1 << evm.removableFeatures.length)
    expect(new Set(evm.variants.map(({ circuitJsonUrl }) => circuitJsonUrl)).size).toBe(
      evm.variants.length,
    )
  }
})
