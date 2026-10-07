import { expect, test } from "bun:test"
import { drv8307EvmDefinition } from "lib/generated/ti-evms/drv8307evm.generated"

test("DRV8307 PWM and speed selector remains populated without the Hall interface", () => {
  for (const componentName of ["JP6", "JP6a"]) {
    expect(
      drv8307EvmDefinition.components.find(({ name }) => name === componentName)
        ?.removableFeatureId,
    ).toBeUndefined()
  }
})
