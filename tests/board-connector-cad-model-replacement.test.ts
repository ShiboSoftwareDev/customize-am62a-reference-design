import { expect, test } from "bun:test"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

test("maps the board-specific Ethernet and USB connector identities", () => {
  expect(
    getCadModelReplacement({
      altiumFootprint: "RJ45_18P_21_23X15_93X13_3MM",
      componentName: "J24",
    })?.kind,
  ).toBe("jscad")
  expect(
    getCadModelReplacement({
      altiumFootprint: "RJ45-7499010211A",
      componentName: "P5",
      manufacturerPartNumber: "7499010211A",
    })?.kind,
  ).toBe("jscad")
  expect(
    getCadModelReplacement({
      altiumFootprint: "USB7P_1R4_14X5R72MM",
      componentName: "J13",
    })?.kind,
  ).toBe("jscad")
  expect(
    getCadModelReplacement({
      altiumFootprint: "USB2_0_TYPE_C",
      componentName: "J14",
    })?.kind,
  ).toBe("jscad")
})
