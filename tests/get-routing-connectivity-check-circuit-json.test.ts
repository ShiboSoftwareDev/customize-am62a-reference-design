import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { getRoutingConnectivityCheckCircuitJson } from "../scripts/ti-evm-reference-generator/get-routing-connectivity-check-circuit-json"

test("normalizes through-layer contacts and component-local copper for routing checks", () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "pcb_board",
      center: { x: 0, y: 0 },
      width: 20,
      height: 10,
      thickness: 1.6,
      num_layers: 6,
      material: "fr4",
    },
    {
      type: "source_trace",
      source_trace_id: "source_trace_power",
      connected_source_net_ids: ["source_net_power"],
      connected_source_port_ids: ["source_port_1", "source_port_2", "source_port_3"],
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_1",
      source_component_id: "source_component_1",
      center: { x: 0, y: 0 },
      width: 1,
      height: 1,
      layer: "bottom",
      rotation: 0,
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_2",
      source_component_id: "source_component_2",
      center: { x: 0.5, y: 0 },
      width: 1,
      height: 1,
      layer: "bottom",
      rotation: 0,
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_3",
      source_component_id: "source_component_3",
      center: { x: 4, y: 0 },
      width: 1,
      height: 1,
      layer: "bottom",
      rotation: 0,
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_1",
      source_port_id: "source_port_1",
      pcb_component_id: "pcb_component_1",
      x: 0,
      y: 0,
      layers: ["bottom"],
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_2",
      source_port_id: "source_port_2",
      pcb_component_id: "pcb_component_2",
      x: 0.5,
      y: 0,
      layers: ["bottom"],
    },
    {
      type: "pcb_port",
      pcb_port_id: "pcb_port_3",
      source_port_id: "source_port_3",
      pcb_component_id: "pcb_component_3",
      x: 4,
      y: 0,
      layers: ["bottom"],
    },
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "local_pad_copper",
      source_net_id: "source_net_power",
      layer: "bottom",
      shape: "polygon",
      points: [
        { x: -1, y: -1 },
        { x: 1, y: -1 },
        { x: 1, y: 1 },
        { x: -1, y: 1 },
      ],
    },
    {
      type: "pcb_copper_pour",
      pcb_copper_pour_id: "shared_plane",
      source_net_id: "source_net_power",
      layer: "bottom",
      shape: "polygon",
      points: [
        { x: -1, y: -1 },
        { x: 5, y: -1 },
        { x: 5, y: 1 },
        { x: -1, y: 1 },
      ],
    },
    {
      type: "pcb_via",
      pcb_via_id: "through_via",
      x: 2,
      y: 2,
      outer_diameter: 0.6,
      hole_diameter: 0.3,
      layers: ["top", "bottom"],
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "through_hole",
      pcb_component_id: "pcb_component_1",
      center: { x: 3, y: 3 },
      shape: "circle",
      hole_shape: "circle",
      outer_diameter: 1,
      hole_diameter: 0.5,
      layers: ["top", "bottom"],
      port_hints: ["1"],
    },
  ] as AnyCircuitElement[]

  const normalizedCircuitJson = getRoutingConnectivityCheckCircuitJson({
    circuitJson,
    featureIdBySourceComponentId: new Map([
      ["source_component_1", "feature_a"],
      ["source_component_2", "feature_a"],
      ["source_component_3", "feature_b"],
    ]),
  })

  expect(
    normalizedCircuitJson.find(
      (element) =>
        element.type === "pcb_copper_pour" && element.pcb_copper_pour_id === "local_pad_copper",
    ),
  ).toMatchObject({ pcb_component_id: "pcb_component_1" })
  expect(
    normalizedCircuitJson.find(
      (element) =>
        element.type === "pcb_copper_pour" && element.pcb_copper_pour_id === "shared_plane",
    ),
  ).not.toHaveProperty("pcb_component_id")
  expect(
    normalizedCircuitJson.find(
      (element) => element.type === "pcb_via" && element.pcb_via_id === "through_via",
    ),
  ).toMatchObject({
    from_layer: "top",
    to_layer: "bottom",
    layers: ["top", "inner1", "inner2", "inner3", "inner4", "bottom"],
  })
  expect(
    normalizedCircuitJson.find(
      (element) =>
        element.type === "pcb_plated_hole" && element.pcb_plated_hole_id === "through_hole",
    ),
  ).toMatchObject({
    layers: ["top", "inner1", "inner2", "inner3", "inner4", "bottom"],
  })
})
