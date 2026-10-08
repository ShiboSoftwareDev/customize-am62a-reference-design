import { expect, test } from "bun:test"
import { drv8307EvmDefinition } from "lib/generated/ti-evms/drv8307evm.generated"

test("DRV8307 variants retain direction, brake, and external PWM selection", () => {
  for (const componentName of ["JP5", "JP6", "JP7"]) {
    expect(
      drv8307EvmDefinition.components.find(({ name }) => name === componentName)
        ?.removableFeatureId,
    ).toBeUndefined()
  }
  expect(
    drv8307EvmDefinition.components.find(({ name }) => name === "JP4")?.removableFeatureId,
  ).toBe("single-ended-hall-conditioning")
  expect(
    drv8307EvmDefinition.components.find(({ name }) => name === "TP1")?.removableFeatureId,
  ).toBe("test-points")
})
