import { expect, test } from "bun:test"
import { lm5155EvmFlyDefinition } from "lib/generated/ti-evms/lm5155evm-fly.generated"
import { getTiEvm } from "lib/ti-evm-catalog"

test("LM5155 separates power measurement from control-loop access", () => {
  expect(
    lm5155EvmFlyDefinition.components.find(({ name }) => name === "J4")?.removableFeatureId,
  ).toBe("control-loop-access")
  expect(
    lm5155EvmFlyDefinition.components.find(({ name }) => name === "J3")?.removableFeatureId,
  ).toBe("power-measurement-access")
  expect(
    lm5155EvmFlyDefinition.components.find(({ name }) => name === "R26")?.removableFeatureId,
  ).toBeUndefined()
  expect(getTiEvm("lm5155evm-fly").removableFeatures.map(({ id }) => id)).toEqual([
    "power-measurement-access",
    "control-loop-access",
  ])
})
