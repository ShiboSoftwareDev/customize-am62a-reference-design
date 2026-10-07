import { expect, test } from "bun:test"
import { lm5155EvmFlyDefinition } from "lib/generated/ti-evms/lm5155evm-fly.generated"
import { getTiEvm } from "lib/ti-evm-catalog"

test("LM5155 removes probe access while retaining its controller population", () => {
  expect(
    lm5155EvmFlyDefinition.components.find(({ name }) => name === "J4")?.removableFeatureId,
  ).toBe("test-and-measurement")
  expect(
    lm5155EvmFlyDefinition.components.find(({ name }) => name === "R26")?.removableFeatureId,
  ).toBeUndefined()
  expect(getTiEvm("lm5155evm-fly").removableFeatures.map(({ id }) => id)).not.toContain(
    "configuration-interface",
  )
})
