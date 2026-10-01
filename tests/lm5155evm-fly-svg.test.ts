import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { lm5155EvmFlyDefinition } from "lib/generated/ti-evms/lm5155evm-fly.generated"
import { expectFullBoardSvgSnapshots } from "tests/fixtures/expect-full-board-svg-snapshots"

test("LM5155EVM-FLY full-board PCB and schematic", async () => {
  const teardropEndpointCount = lm5155EvmFlyDefinition.nets.reduce(
    (count, net) => count + (net.teardropEndpoints?.length ?? 0),
    0,
  )
  expect(teardropEndpointCount).toBe(82)
  expect(lm5155EvmFlyDefinition.nets.filter((net) => net.hasViaTeardrops)).toHaveLength(9)

  const circuitJson = await expectFullBoardSvgSnapshots({
    evmId: "lm5155evm-fly",
    testPath: import.meta.path,
  })
  const taperedTraces = circuitJson.filter(isTaperedPcbTrace)
  expect(taperedTraces.length).toBeGreaterThan(0)
})

function isTaperedPcbTrace(element: AnyCircuitElement): boolean {
  return (
    element.type === "pcb_trace" &&
    Array.isArray(element.route) &&
    element.route.some(isQuadraticWirePoint)
  )
}

function isQuadraticWirePoint(point: unknown): boolean {
  return (
    typeof point === "object" &&
    point !== null &&
    "route_type" in point &&
    point.route_type === "wire" &&
    "width_interpolation_mode" in point &&
    point.width_interpolation_mode === "quadratic"
  )
}
