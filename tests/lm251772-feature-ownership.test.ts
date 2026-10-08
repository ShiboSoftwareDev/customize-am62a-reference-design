import { expect, test } from "bun:test"
import { lm251772EvmPdDefinition } from "lib/generated/ti-evms/lm251772evm-pd.generated"

test("LM251772 separates power, control, and USB2ANY evaluation access", () => {
  const expectedFeatureIdByComponentName = {
    J3: "power-measurement-access",
    J4: "power-measurement-access",
    TP5: "power-measurement-access",
    TP11: "control-debug-access",
    J11: "control-debug-access",
    J12: "usb2any-interface",
    R39: "usb2any-interface",
    R40: "usb2any-interface",
  }

  for (const [componentName, featureId] of Object.entries(expectedFeatureIdByComponentName)) {
    expect(
      lm251772EvmPdDefinition.components.find(({ name }) => name === componentName)
        ?.removableFeatureId,
    ).toBe(featureId)
  }
})
