import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { filterCircuitJsonByElementNames } from "lib/filter-circuit-json-by-element-names"

test("removes a named block and every source-linked derived element", () => {
  const circuitJson = [
    { type: "source_group", source_group_id: "base_group", name: "BASE" },
    {
      type: "source_group",
      source_group_id: "optional_parent_group",
      parent_source_group_id: "base_group",
      name: "OPTIONAL_PARENT",
    },
    {
      type: "source_group",
      source_group_id: "optional_group",
      parent_source_group_id: "optional_parent_group",
      name: "OPTIONAL",
    },
    {
      type: "source_component",
      source_component_id: "optional_component",
      source_group_id: "optional_group",
      name: "U_OPTIONAL",
    },
    {
      type: "source_port",
      source_port_id: "optional_source_port",
      source_component_id: "optional_component",
    },
    { type: "source_net", source_net_id: "shared_net", name: "SHARED" },
    {
      type: "source_trace",
      source_trace_id: "optional_source_trace",
      connected_source_port_ids: ["optional_source_port"],
      connected_source_net_ids: ["shared_net"],
    },
    {
      type: "pcb_component",
      pcb_component_id: "optional_pcb_component",
      source_component_id: "optional_component",
    },
    {
      type: "pcb_port",
      pcb_port_id: "optional_pcb_port",
      pcb_component_id: "optional_pcb_component",
      source_port_id: "optional_source_port",
    },
    {
      type: "pcb_trace",
      pcb_trace_id: "optional_pcb_trace",
      source_trace_id: "optional_source_trace",
      connectsTo: ["optional_pcb_port", "shared_net"],
    },
    {
      type: "pcb_via",
      pcb_via_id: "optional_via",
      pcb_trace_id: "optional_pcb_trace",
    },
    {
      type: "source_component",
      source_component_id: "base_component",
      source_group_id: "base_group",
      name: "U_BASE",
    },
    {
      type: "pcb_group",
      pcb_group_id: "base_pcb_group",
      source_group_id: "base_group",
      pcb_component_ids: ["optional_pcb_component", "base_pcb_component"],
    },
    {
      type: "pcb_component",
      pcb_component_id: "base_pcb_component",
      source_component_id: "base_component",
      pcb_group_id: "base_pcb_group",
    },
  ] as unknown as AnyCircuitElement[]

  const filteredCircuitJson = filterCircuitJsonByElementNames({
    circuitJson,
    excludedElementNames: ["OPTIONAL"],
  })
  const serializedCircuitJson = JSON.stringify(filteredCircuitJson)

  expect(serializedCircuitJson).not.toContain("optional_")
  expect(serializedCircuitJson).not.toContain("OPTIONAL_PARENT")
  expect(serializedCircuitJson).toContain("base_component")
  expect(serializedCircuitJson).toContain("base_pcb_component")
  expect(serializedCircuitJson).toContain("shared_net")
})
