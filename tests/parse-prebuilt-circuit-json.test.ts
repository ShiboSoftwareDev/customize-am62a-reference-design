import { expect, test } from "bun:test"
import { gzipSync, strToU8 } from "fflate"
import { parsePrebuiltCircuitJson } from "app/parse-prebuilt-circuit-json"

test("parses compressed prebuilt Circuit JSON", () => {
  const compressedBytes = gzipSync(strToU8(JSON.stringify([{ type: "pcb_board" }])))

  expect(parsePrebuiltCircuitJson(compressedBytes)).toEqual([{ type: "pcb_board" }])
})
