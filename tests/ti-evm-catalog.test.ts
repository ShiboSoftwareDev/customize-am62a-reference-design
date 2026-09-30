import { expect, test } from "bun:test"
import { getParameterizedTiEvmDefinition } from "lib/evms/parameterized-ti-evms"
import { tiEvms } from "lib/ti-evm-catalog"

test("catalog exposes five real TI EVM product references", () => {
  expect(tiEvms.map(({ name }) => name)).toEqual([
    "SK-AM62A-LP",
    "DRV8307EVM",
    "LM5155EVM-FLY",
    "LM251772EVM-PD",
    "LMG342X-BB-EVM",
  ])
  expect(tiEvms.map(({ schematicSheetLabels }) => schematicSheetLabels.length)).toEqual([
    1, 1, 2, 1, 1,
  ])
  for (const evm of tiEvms) {
    expect(evm.sourceUrl).toStartWith("https://www.ti.com/tool/")
    expect(evm.sourcePath).toBe(`boards/${evm.id}/index.circuit.tsx`)
    expect(evm.variants.length).toBeGreaterThanOrEqual(4)
    expect(evm.variants.length).toBe(1 << evm.removableFeatures.length)
    expect(new Set(evm.variants.map(({ circuitJsonUrl }) => circuitJsonUrl)).size).toBe(
      evm.variants.length,
    )
    if (evm.id !== "sk-am62a-lp") {
      expect(evm.schematicSheetLabels).toHaveLength(
        getParameterizedTiEvmDefinition(evm.id).sourceSchematicPaths.length,
      )
      expect(
        new Set(evm.variants.map(({ schematicCircuitJsonUrl }) => schematicCircuitJsonUrl)).size,
      ).toBe(evm.variants.length)
    }
  }
})
