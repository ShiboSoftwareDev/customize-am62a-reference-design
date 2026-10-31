import { expect, test } from "bun:test"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

test("does not turn an unrecognized switch footprint into a tactile button", () => {
  expect(
    getCadModelReplacement({ altiumFootprint: "SW8_UNKNOWN_DIP", componentName: "SW1" }),
  ).toBeUndefined()
  expect(
    getCadModelReplacement({
      altiumFootprint: "SW4_100X216_200X200_SMD_4-2",
      componentName: "SW3",
    })?.kind,
  ).toBe("jscad")
})
