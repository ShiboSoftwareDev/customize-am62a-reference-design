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

test("omits solid CAD bodies for test pads and assembly markers", () => {
  for (const componentIdentity of [
    { altiumFootprint: "TP20_SMD", componentName: "TP1" },
    { altiumFootprint: "Fiducial10-20", componentName: "FID1" },
    { altiumFootprint: "MTGH200C125D_PL", componentName: "MTG1" },
    { altiumFootprint: "PTH_3_125MM_5", componentName: "MH1" },
  ]) {
    expect(getCadModelReplacement(componentIdentity)).toEqual({ kind: "none" })
  }
})

test("uses package identity instead of broad connector substitutions", () => {
  expect(
    getCadModelReplacement({
      altiumFootprint: "HDR_2X15_PEC15DAAN_S_T_8-6",
      componentName: "J1",
    }),
  ).toEqual({
    kind: "footprinter",
    footprinterString: "headermodule30_rows2_p2.54mm_male",
  })
  expect(
    getCadModelReplacement({
      altiumFootprint: "CON_RJ45-14_LPJG16314A4NL_S_R_T_13-6",
      componentName: "J2",
      manufacturerPartNumber: "LPJG16314A4NL",
    })?.kind,
  ).toBe("jscad")
  expect(
    getCadModelReplacement({
      altiumFootprint: "CON_USBC24_2012670_S_R_S_3-9",
      componentName: "J3",
      manufacturerPartNumber: "2012670005",
    })?.kind,
  ).toBe("jscad")
  expect(
    getCadModelReplacement({
      altiumFootprint: "CON_USB_CUSTOM",
      componentName: "J4",
    }),
  ).toBeUndefined()
})

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

test("creates detailed connector geometry only for recognized source parts", () => {
  const replacement = getCadModelReplacement({
    altiumFootprint: "CON_MUSBB5_629105150521_S_R_S_2-7",
    componentName: "J7",
    manufacturerPartNumber: "629105150521",
  })

  expect(replacement?.kind).toBe("jscad")
  if (replacement?.kind !== "jscad") throw new Error("Expected a JSCAD replacement")
  expect(replacement.jscadOperations.length).toBeGreaterThan(4)
  expect(replacement.jscadOperations.some((operation) => operation.type === "colorize")).toBe(true)
})

test("replaces recognizable Sitara board connectors with multi-part models", () => {
  for (const componentIdentity of [
    { altiumFootprint: "2199119-4", componentName: "J4" },
    { altiumFootprint: "3020-14-0200-00", componentName: "J18" },
    { altiumFootprint: "5019512230", componentName: "J23" },
    { altiumFootprint: "FPC40_0D5_25_4X5_25X2MM", componentName: "J19" },
    { altiumFootprint: "JST4P_1D0_RIGHT", componentName: "J7" },
    { altiumFootprint: "RJ45-7499010211A", componentName: "J1" },
    { altiumFootprint: "USB2_0_TYPE_C", componentName: "J2" },
  ]) {
    const replacement = getCadModelReplacement(componentIdentity)
    expect(replacement?.kind).toBe("jscad")
    if (replacement?.kind !== "jscad") throw new Error("Expected a JSCAD replacement")
    expect(replacement.jscadOperations.length).toBeGreaterThan(4)
  }
})

test("uses board-specific geometry for surface-mount and mikroBUS headers", () => {
  for (const [componentName, altiumFootprint] of [
    ["J14", "HDR_5X3_TSM-105-01-T-TM_S_S_9-9"],
    ["J21", "MIKROBUS16_2D54_25_4X22_88X8_5MM"],
  ]) {
    const replacement = getCadModelReplacement({ altiumFootprint, componentName })
    expect(replacement?.kind).toBe("jscad")
    if (replacement?.kind !== "jscad") throw new Error("Expected a JSCAD replacement")
    expect(replacement.jscadOperations.length).toBeGreaterThan(4)
  }
})

test("replaces prominent Sitara packages with recognizable package models", () => {
  for (const componentIdentity of [
    { altiumFootprint: "AM33XX_15X15", componentName: "U5" },
    { altiumFootprint: "BGA96_T9_P8_10_3X13_3", componentName: "U12" },
    { altiumFootprint: "MOD100_WL18", componentName: "MOD1" },
    { altiumFootprint: "L4P_2D54", componentName: "L1" },
    { altiumFootprint: "SW4SMD_63X161LS", componentName: "SW1" },
    { altiumFootprint: "XTAL4_126-216SMD", componentName: "Y1" },
  ]) {
    const replacement = getCadModelReplacement(componentIdentity)
    expect(replacement?.kind).toBe("jscad")
    if (replacement?.kind !== "jscad") throw new Error("Expected a JSCAD replacement")
    expect(replacement.jscadOperations.length).toBeGreaterThan(1)
  }
})

test("replaces dimensioned QFP, BGA, and LGA source extrusions", () => {
  for (const [componentName, altiumFootprint] of [
    ["U14", "TQFP128_15-74_550X550_1-2"],
    ["U42", "VFBGA153_19-68_460X520_1-3"],
    ["U5", "E-13_4X13_3-N100_0_75-TOP"],
  ]) {
    const replacement = getCadModelReplacement({ altiumFootprint, componentName })
    expect(replacement?.kind).toBe("jscad")
    if (replacement?.kind !== "jscad") throw new Error("Expected a JSCAD replacement")
    expect(replacement.jscadOperations.length).toBeGreaterThan(4)
  }
})

test("reads body dimensions encoded with Altium decimal separators", () => {
  for (const [componentName, altiumFootprint] of [
    ["U3", "BGA153_P14_P5_11P5X13"],
    ["U2", "BGA96_T9_P8_10_3X13_3"],
  ]) {
    const replacement = getCadModelReplacement({ altiumFootprint, componentName })
    expect(replacement?.kind).toBe("jscad")
    if (replacement?.kind !== "jscad") throw new Error("Expected a JSCAD replacement")
    expect(replacement.jscadOperations.length).toBeGreaterThan(90)
  }
})

test("does not read an Altium footprint revision as a decimal dimension", () => {
  const replacement = getCadModelReplacement({
    altiumFootprint: "BGA24_39-37_240X310_1",
    componentName: "U34",
  })
  expect(replacement?.kind).toBe("jscad")
  if (replacement?.kind !== "jscad") throw new Error("Expected a JSCAD replacement")

  const bodyOperation = replacement.jscadOperations[0]
  expect(bodyOperation).toMatchObject({
    type: "colorize",
    shape: {
      type: "translate",
      shape: { size: [6.1, 7.87, 1.2] },
    },
  })
})

test("uses a bounded dimensioned model for the Sitara BGA425 package", () => {
  for (const altiumFootprint of ["BGA425_0D5_13X13MM", "BGA425_19-68_510X510_0-7"]) {
    const replacement = getCadModelReplacement({ altiumFootprint, componentName: "U1" })
    expect(replacement?.kind).toBe("jscad")
    if (replacement?.kind !== "jscad") throw new Error("Expected a JSCAD replacement")
    expect(replacement.jscadOperations).toHaveLength(427)
  }
})
