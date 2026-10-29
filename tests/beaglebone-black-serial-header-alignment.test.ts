import { expect, test } from "bun:test"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

test("aligns the BeagleBone Black serial header with its plated-hole row", () => {
  const replacement = getCadModelReplacement({
    altiumFootprint: "SIP6",
    componentName: "J1",
  })

  expect(replacement).toEqual({
    footprinterString: "headermodule6_p2.54mm_male",
    kind: "footprinter",
    modelYawOffsetDegrees: 90,
  })
})
