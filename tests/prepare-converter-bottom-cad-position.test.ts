import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { prepareConverterCircuitJson } from "../scripts/ti-evm-reference-generator/prepare-converter-circuit-json"

test("leaves bottom CAD positions in board coordinates", () => {
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
      pcb_component_id: "bottom_component",
      source_component_id: "source_bottom_component",
      center: { x: 2, y: 1 },
      layer: "bottom",
      rotation: 90,
    },
    {
      type: "cad_component",
      cad_component_id: "bottom_cad_model",
      pcb_component_id: "bottom_component",
      position: { x: 2.5, y: 1.25, z: -0.8 },
      rotation: { x: 0, y: 180, z: 90 },
      model_glb_url: "/cad-model.glb",
    },
  ] as AnyCircuitElement[]

  const preparedCircuitJson = prepareConverterCircuitJson(circuitJson)
  const cadModel = preparedCircuitJson.find((element) => element.type === "cad_component")

  expect(cadModel).toMatchObject({
    position: { x: 2.5, y: 1.25, z: -0.8 },
    rotation: { x: 0, y: 180, z: 90 },
  })
})
