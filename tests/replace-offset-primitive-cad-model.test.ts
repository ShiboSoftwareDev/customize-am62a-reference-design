import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { replacePrimitiveCadModels } from "../scripts/prebuild-ti-evm-cad-scenes/replace-primitive-cad-models"

test("centers a replacement on the imported primitive geometry", () => {
  const circuitJson = [
    {
      type: "source_component",
      source_component_id: "source_component_j4",
      ftype: "simple_chip",
      name: "J4",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_j4",
      source_component_id: "source_component_j4",
      center: { x: 76.09394992, y: 121.20891938 },
      width: 37.27958,
      height: 21.919184,
      layer: "top",
      rotation: 90,
    },
    {
      type: "cad_component",
      cad_component_id: "cad_component_j4",
      source_component_id: "source_component_j4",
      pcb_component_id: "pcb_component_j4",
      position: { x: 81.75055532, y: 121.20891938, z: 0.8 },
      rotation: { x: 0, y: 0, z: 0 },
      model_unit_to_mm_scale_factor: 1,
      model_jscad: {
        type: "colorize",
        shape: {
          type: "extrudeLinear",
          options: { height: 3.81 },
          shape: {
            type: "fromPointsGeom2",
            points: [
              [-23.6080046, -11.049],
              [-15.7340046, -11.049],
              [-15.7340046, 11.049],
              [-23.6080046, 11.049],
            ],
          },
        },
      },
    },
  ] satisfies AnyCircuitElement[]

  const result = replacePrimitiveCadModels({
    circuitJson,
    sourceFootprintByComponentName: new Map([["J4", "CON_MINIPCI75_2199119-4_S_R_S_3-2_2244"]]),
  })
  const cadComponent = result.circuitJson.find(
    (element) =>
      element.type === "cad_component" && element.cad_component_id === "cad_component_j4",
  )
  const position = cadComponent?.position
  if (
    !position ||
    typeof position !== "object" ||
    !("x" in position) ||
    !("y" in position) ||
    !("z" in position)
  ) {
    throw new Error("Replacement CAD component has no position")
  }

  expect(position.x).toBeCloseTo(62.07955072)
  expect(position.y).toBeCloseTo(121.20891938)
  expect(position.z).toBe(0.8)
  expect(cadComponent?.rotation).toEqual({ x: 0, y: 0, z: 90 })
})
