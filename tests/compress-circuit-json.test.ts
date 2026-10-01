import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { gunzipSync, strFromU8 } from "fflate"
import { compressCircuitJson } from "../scripts/ti-evm-reference-generator/compress-circuit-json"

test("Circuit JSON compression is deterministic and lossless", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "source_component",
      source_component_id: "source_component_0",
      name: "U1",
    },
  ]

  const firstArchive = compressCircuitJson(circuitJson)
  const secondArchive = compressCircuitJson(circuitJson)

  expect(firstArchive).toEqual(secondArchive)
  expect([...firstArchive.slice(4, 8)]).toEqual([0, 0, 0, 0])
  expect(JSON.parse(strFromU8(gunzipSync(firstArchive)))).toEqual(circuitJson)
})
