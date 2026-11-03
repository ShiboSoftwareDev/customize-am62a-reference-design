import { expect, test } from "bun:test"
import { getDnpComponentNames } from "../scripts/prebuild-ti-evm-cad-scenes/get-dnp-component-names"

test("uses the released BOM population without omitting fitted alternatives", () => {
  for (const componentName of ["OSC2", "R221", "C254"]) {
    expect(getDnpComponentNames("beagleplay")).toContain(componentName)
  }
  for (const componentName of ["U44", "R144", "R302"]) {
    expect(getDnpComponentNames("tmds62levm")).toContain(componentName)
  }
  for (const componentName of ["R1", "R2", "R9", "R275", "R279"]) {
    expect(getDnpComponentNames("sk-am62")).toContain(componentName)
  }
  expect(getDnpComponentNames("beagleplay")).not.toContain("J6")
  expect(getDnpComponentNames("beagleplay")).not.toContain("R220")
  expect(getDnpComponentNames("tmds62levm")).not.toContain("R311")
  expect(getDnpComponentNames("sk-am62")).not.toContain("R284")
  expect(getDnpComponentNames("beaglebone-black")).toEqual(new Set())
})
