import { expect, test } from "bun:test"
import { checkEachPcbPortConnectedToPcbTraces } from "@tscircuit/checks"
import { evaluateParameterizedTiEvm } from "../lib/server/evaluate-board"

test("DRV8307 single-ended Hall removal does not retain conditioning traces", async () => {
  const result = await evaluateParameterizedTiEvm({
    evmId: "drv8307evm",
    options: { removedFeatureIds: ["single-ended-hall-conditioning"] },
  })

  expect(checkEachPcbPortConnectedToPcbTraces(result.circuitJson)).toEqual([])
}, 30_000)
