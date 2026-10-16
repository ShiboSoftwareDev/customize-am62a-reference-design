import { expect, test } from "bun:test"
import { getTiEvm } from "lib/ti-evm-catalog"

test("Sitara board variant labels describe their curated configurations", () => {
  expect(getTiEvm("tmds62levm").variants.map(({ label }) => label)).toEqual([
    "Full board",
    "Without M.2 and Ethernet connectivity",
    "Without HDMI and audio",
    "Without display and control expansion",
    "Without debug and current instrumentation",
    "Minimal board",
  ])
  expect(getTiEvm("sk-am62").variants.map(({ label }) => label)).toEqual([
    "Full board",
    "Without wireless and Ethernet connectivity",
    "Without test and debug",
    "Without expansion interfaces",
    "Without display, camera, and audio",
    "Minimal board",
  ])
  expect(getTiEvm("beagleplay").variants.map(({ label }) => label)).toEqual([
    "Full board",
    "Without wired networking",
    "Without display and camera",
    "Without wireless connectivity",
    "Without user I/O and expansion",
    "Minimal board",
  ])
  expect(getTiEvm("beaglebone-black").variants.map(({ label }) => label)).toEqual([
    "Full board",
    "Without eMMC storage",
    "Without Ethernet",
    "Without HDMI output",
    "Minimal board",
  ])
})
