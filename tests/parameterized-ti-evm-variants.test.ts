import { expect, test } from "bun:test"
import { tiEvms } from "lib/ti-evm-catalog"

test("each EVM variant maps to a unique TSX population", () => {
  for (const evm of tiEvms) {
    const populations = evm.variants.map(({ evmOptions }) => JSON.stringify(evmOptions))
    expect(populations.every((population) => population !== undefined)).toBe(true)
    expect(new Set(populations).size).toBe(evm.variants.length)
  }
})
