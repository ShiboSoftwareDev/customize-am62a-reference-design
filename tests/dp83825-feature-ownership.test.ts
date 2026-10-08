import { expect, test } from "bun:test"
import { dp83825EvmDefinition } from "lib/generated/ti-evms/dp83825evm.generated"

test("DP83825 separates indicators and clock test access", () => {
  const expectedFeatureIdByComponentName = {
    LD1: "power-indicator",
    R4: "power-indicator",
    LD2: "phy-status-indicators",
    LD3: "phy-status-indicators",
    LD4: "phy-status-indicators",
    J12: "clock-test-access",
    J15: "clock-test-access",
  }

  for (const [componentName, featureId] of Object.entries(expectedFeatureIdByComponentName)) {
    expect(
      dp83825EvmDefinition.components.find(({ name }) => name === componentName)
        ?.removableFeatureId,
    ).toBe(featureId)
  }
  expect(
    dp83825EvmDefinition.components.find(({ name }) => name === "J10")?.removableFeatureId,
  ).toBeUndefined()
})
