import { expect, test } from "bun:test"
import { getTiEvm } from "lib/ti-evm-catalog"

test("DRV8307 variant labels describe its curated electrical configurations", () => {
  expect(getTiEvm("drv8307evm").variants.map(({ label }) => label)).toEqual([
    "Full board",
    "External PWM",
    "Differential Hall inputs",
    "Without status indicators",
    "External PWM + differential Hall",
    "Minimal board",
  ])
})
