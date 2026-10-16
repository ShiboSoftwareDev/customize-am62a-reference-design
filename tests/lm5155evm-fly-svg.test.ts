import { expect, test } from "bun:test"
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
  const importedPcbTraces = circuitJson.filter(
    (element) =>
      element.type === "pcb_trace" &&
      typeof element.source_trace_id === "string" &&
      element.source_trace_id.startsWith("source_net_"),
  )
  expect(importedPcbTraces.length).toBeGreaterThan(0)
  expect(circuitJson.filter(({ type }) => type === "pcb_copper_pour").length).toBeGreaterThan(0)
})
