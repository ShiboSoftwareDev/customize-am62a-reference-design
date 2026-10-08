import { expect, test } from "bun:test"
import { lmg342xBbEvmDefinition } from "lib/generated/ti-evms/lmg342x-bb-evm.generated"

test("LMG342X retains its PWM selector and removes complete status indicators", () => {
  expect(
    lmg342xBbEvmDefinition.components.find(({ name }) => name === "J14")?.removableFeatureId,
  ).toBeUndefined()
  for (const componentName of [
    "R10",
    "R11",
    "R12",
    "R13",
    "R14",
    "R16",
    "R17",
    "R18",
    "R19",
    "R20",
    "R31",
    "X_5V_EN",
  ]) {
    expect(
      lmg342xBbEvmDefinition.components.find(({ name }) => name === componentName)
        ?.removableFeatureId,
    ).toBe("status-indicators")
  }
  for (const componentName of ["X_12V", "X_5V"]) {
    expect(
      lmg342xBbEvmDefinition.components.find(({ name }) => name === componentName)
        ?.removableFeatureId,
    ).toBe("measurement-interface")
  }
})
