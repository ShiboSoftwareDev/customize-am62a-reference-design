import { expect, test } from "bun:test"
import { getPackageHeightMillimeters } from "../scripts/prebuild-ti-evm-cad-scenes/get-package-height-millimeters"

test("reads a TI package-height suffix without treating body-size decimals as height", () => {
  expect(getPackageHeightMillimeters("DSBGA12_15-74_60X70_0-4")).toBe(0.4)
  expect(getPackageHeightMillimeters("LQFP64_19-68_390X390_1-6")).toBe(1.6)
  expect(getPackageHeightMillimeters("BGA24_39-37_240X310_1")).toBe(1)
  expect(getPackageHeightMillimeters("XTAL4_ECX-53BQ_200X130_SMD_0-9")).toBe(0.9)
  expect(getPackageHeightMillimeters("X4-SMD-3_2X2_5X1_0MM")).toBe(1)
  expect(getPackageHeightMillimeters("PACKAGE_320X250X100MM")).toBe(1)
  expect(getPackageHeightMillimeters("BGA96_T9_P8_10_3X13_3")).toBeUndefined()
  expect(getPackageHeightMillimeters("BGA153_P14_P5_11P5X13")).toBeUndefined()
  expect(getPackageHeightMillimeters("BGA425_0D5_13X13MM")).toBeUndefined()
})
