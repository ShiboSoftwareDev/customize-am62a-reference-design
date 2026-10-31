import { expect, test } from "bun:test"
import { createUflConnectorCadModel } from "../scripts/prebuild-ti-evm-cad-scenes/create-board-connector-cad-models"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

test("uses the detailed U.FL model for both Sitara source footprints", () => {
  for (const componentIdentity of [
    {
      altiumFootprint: "CON_JACK3_U-FL-R-SMT_P_S_S_1-3",
      componentName: "J1",
      manufacturerPartNumber: "U.FL-R-SMT-1(01)",
    },
    {
      altiumFootprint: "U-FL3P-SMD-2_6X2_6X1_0MM",
      componentName: "J3",
    },
  ]) {
    const replacement = getCadModelReplacement(componentIdentity)
    expect(replacement?.kind).toBe("jscad")
    if (replacement?.kind !== "jscad") throw new Error("Expected a JSCAD replacement")
    expect(replacement.jscadOperations).toEqual(createUflConnectorCadModel())
  }
})
