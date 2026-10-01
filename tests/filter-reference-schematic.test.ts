import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { filterReferenceSchematic } from "../lib/evms/filter-reference-schematic"

test("reference schematic filtering removes a feature without dangling references", () => {
  const circuitJson = [
    { type: "source_component", source_component_id: "source_u1", name: "U1" },
    { type: "source_component", source_component_id: "source_u2", name: "U2" },
    {
      type: "source_port",
      source_port_id: "port_u1",
      source_component_id: "source_u1",
      name: "1",
    },
    {
      type: "source_port",
      source_port_id: "port_u2",
      source_component_id: "source_u2",
      name: "1",
    },
    {
      type: "source_trace",
      source_trace_id: "source_trace_1",
      connected_source_port_ids: ["port_u1", "port_u2"],
      connected_source_net_ids: ["source_net_1"],
    },
    {
      type: "schematic_component",
      schematic_component_id: "schematic_u1",
      source_component_id: "source_u1",
    },
    {
      type: "schematic_component",
      schematic_component_id: "schematic_u2",
      source_component_id: "source_u2",
    },
    {
      type: "schematic_port",
      schematic_port_id: "schematic_port_u1",
      source_port_id: "port_u1",
      schematic_component_id: "schematic_u1",
    },
    {
      type: "schematic_port",
      schematic_port_id: "schematic_port_u2",
      source_port_id: "port_u2",
      schematic_component_id: "schematic_u2",
    },
    {
      type: "schematic_trace",
      schematic_trace_id: "schematic_trace_1",
      source_trace_id: "source_trace_1",
      junctions: [],
      edges: [
        {
          from: { x: 0, y: 0 },
          to: { x: 1, y: 0 },
          from_schematic_port_id: "schematic_port_u1",
        },
        {
          from: { x: 1, y: 0 },
          to: { x: 2, y: 0 },
          to_schematic_port_id: "schematic_port_u2",
        },
      ],
    },
    {
      type: "schematic_group",
      schematic_group_id: "schematic_group_1",
      name: "Sheet",
      schematic_component_ids: ["schematic_u1", "schematic_u2"],
      center: { x: 0, y: 0 },
      width: 10,
      height: 10,
    },
  ] as AnyCircuitElement[]

  const filteredCircuitJson = filterReferenceSchematic({
    circuitJson,
    removedComponentNames: new Set(["U1"]),
  })

  expect(filteredCircuitJson).not.toContainEqual(
    expect.objectContaining({ source_component_id: "source_u1" }),
  )
  expect(filteredCircuitJson).toContainEqual(
    expect.objectContaining({ source_component_id: "source_u2" }),
  )
  expect(filteredCircuitJson).toContainEqual(
    expect.objectContaining({
      type: "source_trace",
      connected_source_port_ids: ["port_u2"],
    }),
  )
  expect(filteredCircuitJson).toContainEqual(
    expect.objectContaining({
      type: "schematic_trace",
      edges: [expect.objectContaining({ to_schematic_port_id: "schematic_port_u2" })],
    }),
  )
  expect(filteredCircuitJson).toContainEqual(
    expect.objectContaining({
      type: "schematic_group",
      schematic_component_ids: ["schematic_u2"],
    }),
  )
})
