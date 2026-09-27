import { expect, test } from "bun:test"
import { deriveModuleFlags, minimalOptionalModules } from "lib/module-config"

test("minimal selection retains required modules and disables optional dependencies", () => {
  const flags = deriveModuleFlags(minimalOptionalModules)

  expect(flags.processorSupport).toBe(true)
  expect(flags.lpddr4).toBe(true)
  expect(flags.powerInput).toBe(true)
  expect(flags.emmc).toBe(false)
  expect(flags.peripheralPower).toBe(false)
  expect(flags.ioExpander).toBe(false)
})
