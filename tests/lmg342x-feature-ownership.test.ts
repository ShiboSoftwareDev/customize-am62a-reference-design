import { expect, test } from "bun:test"
import { lmg342xBbEvmDefinition } from "lib/generated/ti-evms/lmg342x-bb-evm.generated"

test("LMG342X retains its PWM selector and removes complete status indicators", () => {
  expect(
    lmg342xBbEvmDefinition.components.find(({ name }) => name === "J14")?.removableFeatureId,
  ).toBeUndefined()
  for (const componentName of ["R20", "R31"]) {
    expect(
      lmg342xBbEvmDefinition.components.find(({ name }) => name === componentName)
        ?.removableFeatureId,
    ).toBe("status-indicators")
  }
})
