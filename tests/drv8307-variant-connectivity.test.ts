import { expect, test } from "bun:test"
import { checkEachPcbPortConnectedToPcbTraces } from "@tscircuit/checks"
import { evaluateParameterizedTiEvm } from "../lib/server/evaluate-board"

test("DRV8307 hall-interface removal does not retain single-ended traces", async () => {
  const result = await evaluateParameterizedTiEvm({
    evmId: "drv8307evm",
    options: { removedFeatureIds: ["hall-interface"] },
  })

  expect(checkEachPcbPortConnectedToPcbTraces(result.circuitJson)).toEqual([])
}, 30_000)
