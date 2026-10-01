import { expect, test } from "bun:test"
import { getTiEvm } from "lib/ti-evm-catalog"

test("variant labels describe the optional blocks included by each configuration", () => {
  expect(getTiEvm("drv8307evm").variants.map(({ label }) => label)).toEqual([
    "Full board",
    "Hall-sensor interface only",
    "On-board speed control only",
    "Minimal board",
  ])
})
