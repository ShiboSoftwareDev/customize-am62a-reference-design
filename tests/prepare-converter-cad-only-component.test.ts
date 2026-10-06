import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { prepareConverterCircuitJson } from "../scripts/ti-evm-reference-generator/prepare-converter-circuit-json"

test("keeps off-board components that own CAD models", () => {
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
      pcb_component_id: "cad_only_component",
      source_component_id: "source_cad_only_component",
      center: { x: 30, y: 20 },
      layer: "top",
      rotation: 0,
    },
    {
      type: "cad_component",
      cad_component_id: "cad_model",
      pcb_component_id: "cad_only_component",
      position: { x: 30, y: 20, z: 0.8 },
      rotation: { x: 0, y: 0, z: 0 },
      model_glb_url: "/cad-model.glb",
    },
    {
      type: "pcb_fabrication_note_text",
      pcb_fabrication_note_text_id: "offboard_note",
      pcb_component_id: "cad_only_component",
      anchor_position: { x: 30, y: 20 },
      text: "CAD anchor",
      font: "tscircuit2024",
      font_size: 1,
      anchor_alignment: "center",
    },
  ] as AnyCircuitElement[]

  const preparedCircuitJson = prepareConverterCircuitJson(circuitJson)

  expect(
    preparedCircuitJson.some(
      (element) =>
        "pcb_component_id" in element && element.pcb_component_id === "cad_only_component",
    ),
  ).toBe(true)
  expect(
    preparedCircuitJson.some(
      (element) =>
        element.type === "pcb_fabrication_note_text" &&
        "pcb_component_id" in element &&
        element.pcb_component_id === "cad_only_component",
    ),
  ).toBe(false)
})
