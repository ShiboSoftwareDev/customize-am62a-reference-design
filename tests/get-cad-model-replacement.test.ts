import { expect, test } from "bun:test"
import { getCadModelReplacement } from "../scripts/prebuild-ti-evm-cad-scenes/get-cad-model-replacement"

test("maps standard Altium package identities to reusable CAD models", () => {
  for (const componentIdentity of [
    {
      altiumFootprint: "CAP0201_0-5",
      componentName: "C1",
    },
    {
      altiumFootprint: "RES0402_0-5",
      componentName: "R1",
    },
  ]) {
    const replacement = getCadModelReplacement(componentIdentity)
    expect(replacement?.kind).toBe("jscad")
    if (replacement?.kind !== "jscad") throw new Error("Expected a JSCAD replacement")
    expect(replacement.jscadOperations).toHaveLength(3)
  }
  expect(
    getCadModelReplacement({
      altiumFootprint: "QFN32_19-68_200X200",
      componentName: "U1",
    }),
  ).toEqual({ kind: "footprinter", footprinterString: "qfn32_w5.08mm_h5.08mm" })
  expect(
    getCadModelReplacement({
      altiumFootprint: "SOT23-5_1-5",
      componentName: "U2",
    }),
  ).toEqual({ kind: "footprinter", footprinterString: "sot23-5" })
  expect(
    getCadModelReplacement({
      altiumFootprint: "SO8-25X75",
      componentName: "U4",
    }),
  ).toEqual({
    footprinterString: "soic8_p1.27mm",
    kind: "footprinter",
    modelYawOffsetDegrees: 90,
  })
})
