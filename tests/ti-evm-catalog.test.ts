import { expect, test } from "bun:test"
import { getParameterizedTiEvmDefinition } from "lib/evms/parameterized-ti-evms"
import { tiEvms } from "lib/ti-evm-catalog"

test("catalog exposes four Sitara board references", () => {
  expect(tiEvms.map(({ name }) => name)).toEqual([
    "TMDS62LEVM",
    "SK-AM62",
    "BeaglePlay",
    "BeagleBone Black",
  ])
  expect(tiEvms.map(({ schematicSheetLabels }) => schematicSheetLabels.length)).toEqual([
    57, 44, 22, 11,
  ])
  for (const evm of tiEvms) {
    expect(evm.sourceUrl).toStartWith("https://")
    expect(evm.sourcePath).toBe(`boards/${evm.id}/index.circuit.tsx`)
    expect(evm.variants.length).toBeGreaterThanOrEqual(4)
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
