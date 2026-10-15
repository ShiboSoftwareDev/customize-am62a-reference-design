import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getActionableElectricalErrors } from "../scripts/get-actionable-electrical-errors"

test("electrical validation trusts imported and poured nets only", () => {
  const circuitJson: AnyCircuitElement[] = [
    {
      type: "source_trace",
      source_trace_id: "source_trace_imported",
      connected_source_net_ids: ["source_net_imported"],
      connected_source_port_ids: [],
    },
    {
      type: "source_trace",
      source_trace_id: "source_trace_rerouted",
      connected_source_net_ids: ["source_net_rerouted"],
      connected_source_port_ids: [],
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "pcb_trace_imported",
      source_trace_id: "source_net_imported",
      route: [],
    },
  ]
  const importedError: AnyCircuitElement = {
    type: "pcb_port_not_connected_error",
    pcb_port_not_connected_error_id: "pcb_port_not_connected_error_trace_source_trace_imported",
    message: "Imported reference route is not modeled by the checker",
  }
  const reroutedError: AnyCircuitElement = {
    type: "pcb_port_not_connected_error",
    pcb_port_not_connected_error_id: "pcb_port_not_connected_error_trace_source_trace_rerouted",
    message: "New route is disconnected",
  }

  expect(
    getActionableElectricalErrors({
      circuitJson,
      electricalErrors: [importedError, reroutedError],
    }),
  ).toEqual([reroutedError])
})
