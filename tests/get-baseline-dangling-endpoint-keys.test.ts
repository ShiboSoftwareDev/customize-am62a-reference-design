import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getFullConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"
import { getBaselineDanglingEndpointKeys } from "../scripts/ti-evm-reference-generator/get-included-imported-routing-element-ids"

test("keeps baseline dangling endpoints distinct across overlapping PCB traces", () => {
  const circuitJson = [
    {
      type: "source_trace",
      source_trace_id: "source_trace_power",
      connected_source_port_ids: [],
      connected_source_net_ids: ["source_net_power"],
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "top_trace",
      source_trace_id: "source_trace_power",
      route: [
        { route_type: "wire", x: 0, y: 0, width: 0.2, layer: "top" },
        { route_type: "wire", x: 1, y: 0, width: 0.2, layer: "top" },
      ],
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "bottom_trace",
      source_trace_id: "source_trace_power",
      route: [
        { route_type: "wire", x: 0, y: 0, width: 0.2, layer: "bottom" },
        { route_type: "wire", x: 1, y: 0, width: 0.2, layer: "bottom" },
      ],
    },
  ] as AnyCircuitElement[]
  const connectivityMap = getFullConnectivityMapFromCircuitJson(circuitJson)

  expect(getBaselineDanglingEndpointKeys(circuitJson, connectivityMap)).toEqual(
    new Set([
      "disconnected_endpoint_top_trace_start",
      "disconnected_endpoint_top_trace_end",
      "disconnected_endpoint_bottom_trace_start",
      "disconnected_endpoint_bottom_trace_end",
    ]),
  )
})
