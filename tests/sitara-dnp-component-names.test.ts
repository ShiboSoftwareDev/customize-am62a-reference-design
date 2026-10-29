import { expect, test } from "bun:test"
import { getDnpComponentNames } from "../scripts/prebuild-ti-evm-cad-scenes/get-dnp-component-names"

test("uses the demo catalog IDs for documented DNP alternatives", () => {
  expect(getDnpComponentNames("beagleplay")).toEqual(new Set(["OSC2"]))
  expect(getDnpComponentNames("tmds62levm")).toContain("U44")
  expect(getDnpComponentNames("sk-am62")).toEqual(new Set())
  expect(getDnpComponentNames("beaglebone-black")).toEqual(new Set())
})
