import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { prepareConverterCircuitJson } from "../scripts/ti-evm-reference-generator/prepare-converter-circuit-json"

test("removes off-board annotations without removing physical components", () => {
  const circuitJson = [
    {
      type: "pcb_board",
      pcb_board_id: "board",
      center: { x: 0, y: 0 },
      width: 20,
      height: 10,
      outline: [],
      thickness: 1.6,
      num_layers: 2,
      material: "fr4",
    },
    {
      type: "pcb_component",
      pcb_component_id: "inside",
      source_component_id: "source_inside",
      center: { x: 5, y: 2 },
      layer: "top",
      rotation: 0,
    },
    {
      type: "pcb_component",
      pcb_component_id: "outside",
      source_component_id: "source_outside",
      center: { x: 30, y: 20 },
      layer: "top",
      rotation: 0,
    },
    {
      type: "pcb_component",
      pcb_component_id: "outside_physical",
      source_component_id: "source_outside_physical",
      center: { x: 30, y: 20 },
      layer: "top",
      rotation: 0,
    },
    {
      type: "pcb_plated_hole",
      pcb_plated_hole_id: "outside_physical_hole",
      pcb_component_id: "outside_physical",
      center: { x: 9.5, y: 0 },
      shape: "circle",
      hole_shape: "circle",
      outer_diameter: 2,
      hole_diameter: 1,
      layers: ["top", "bottom"],
      port_hints: ["1"],
    },
    {
      type: "pcb_fabrication_note_text",
      pcb_fabrication_note_text_id: "inside_note",
      pcb_component_id: "inside",
      anchor_position: { x: 5, y: 2 },
      text: "inside",
      font: "tscircuit2024",
      font_size: 1,
      anchor_alignment: "center",
    },
    {
      type: "pcb_fabrication_note_text",
      pcb_fabrication_note_text_id: "outside_note",
      pcb_component_id: "outside",
      anchor_position: { x: 30, y: 20 },
      text: "outside",
      font: "tscircuit2024",
      font_size: 1,
      anchor_alignment: "center",
    },
  ] as AnyCircuitElement[]

  const preparedCircuitJson = prepareConverterCircuitJson(circuitJson)

  expect(preparedCircuitJson.find(({ type }) => type === "pcb_board")).toBeDefined()
  expect(
    preparedCircuitJson.find(
      (element) => "pcb_component_id" in element && element.pcb_component_id === "inside",
    ),
  ).toBeDefined()
  expect(
    preparedCircuitJson.some(
      (element) => "pcb_component_id" in element && element.pcb_component_id === "outside",
    ),
  ).toBe(false)
  expect(
    preparedCircuitJson.some(
      (element) => "pcb_component_id" in element && element.pcb_component_id === "outside_physical",
    ),
  ).toBe(true)
})
