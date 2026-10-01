import { expect, test } from "bun:test"
import { gzipSync, strToU8 } from "fflate"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"

test("parses raw gzip and browser-decoded prebuilt Circuit JSON", () => {
  const circuitJson = [{ type: "pcb_board", pcb_board_id: "board" }]
  const jsonBytes = strToU8(JSON.stringify(circuitJson))
  const compressedCircuitJson = gzipSync(jsonBytes)

  expect(parsePrebuiltCircuitJson(compressedCircuitJson)).toEqual(circuitJson)
  expect(parsePrebuiltCircuitJson(jsonBytes)).toEqual(circuitJson)
})
