import { expect, test } from "bun:test"
import { getParameterizedTiEvmDefinition } from "lib/evms/parameterized-ti-evms"
import { tiEvms } from "lib/ti-evm-catalog"

test("catalog exposes five real TI EVM product references", () => {
  expect(tiEvms.map(({ name }) => name)).toEqual([
    "DP83825EVM",
    "DRV8307EVM",
    "LM5155EVM-FLY",
    "LM251772EVM-PD",
    "LMG342X-BB-EVM",
  ])
  expect(tiEvms.map(({ schematicSheetLabels }) => schematicSheetLabels.length)).toEqual([
    5, 1, 2, 1, 1,
  ])
  for (const evm of tiEvms) {
    expect(evm.sourceUrl).toStartWith("https://www.ti.com/tool/")
    expect(evm.sourcePath).toBe(`boards/${evm.id}/index.circuit.tsx`)
    expect(evm.variants.length).toBeGreaterThanOrEqual(4)
    expect(evm.variants.length).toBe(1 << evm.removableFeatures.length)
    expect(new Set(evm.variants.map(({ circuitJsonUrl }) => circuitJsonUrl)).size).toBe(
      evm.variants.length,
    )
    expect(evm.schematicSheetLabels).toHaveLength(
      getParameterizedTiEvmDefinition(evm.id).sourceSchematicPaths.length,
    )
    for (const variant of evm.variants) {
      expect(variant.schematicCircuitJsonUrls).toHaveLength(evm.schematicSheetLabels.length)
    }
    expect(
      new Set(evm.variants.flatMap(({ schematicCircuitJsonUrls }) => schematicCircuitJsonUrls))
        .size,
    ).toBe(evm.variants.length * evm.schematicSheetLabels.length)
  }
})
