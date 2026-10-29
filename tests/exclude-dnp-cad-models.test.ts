import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { replacePrimitiveCadModels } from "../scripts/prebuild-ti-evm-cad-scenes/replace-primitive-cad-models"
import type { SourceFootprintByComponentName } from "../scripts/prebuild-ti-evm-cad-scenes/read-source-footprints"

test("removes CAD only for explicitly excluded DNP components", () => {
  const circuitJson = [
    {
      type: "source_component",
      source_component_id: "source_component_fitted",
      ftype: "simple_chip",
      name: "X2",
    },
    {
      type: "source_component",
      source_component_id: "source_component_dnp",
      ftype: "simple_chip",
      name: "OSC2",
    },
    {
      type: "cad_component",
      cad_component_id: "cad_component_fitted",
      source_component_id: "source_component_fitted",
      model_step_url: "/models/oscillator.step",
      position: { x: 1, y: 2, z: 0.5 },
    },
    {
      type: "cad_component",
      cad_component_id: "cad_component_dnp",
      source_component_id: "source_component_dnp",
      model_jscad: { type: "cuboid", size: [2.5, 2, 1] },
      position: { x: 1, y: 2, z: 0.5 },
    },
  ] satisfies AnyCircuitElement[]
  const sourceFootprintByComponentName: SourceFootprintByComponentName = new Map([
    ["X2", "X4-SMD-2_5X2_0X1_0MM"],
    ["OSC2", "X4-SMD-2_5X2_0X1_0MM"],
  ])

  const result = replacePrimitiveCadModels({
    circuitJson,
    excludedComponentNames: new Set(["OSC2"]),
    sourceFootprintByComponentName,
  })

  expect(
    result.circuitJson.find(
      (element) =>
        element.type === "cad_component" && element.cad_component_id === "cad_component_fitted",
    ),
  ).toMatchObject({ model_step_url: "/models/oscillator.step" })
  expect(
    result.circuitJson.find(
      (element) =>
        element.type === "cad_component" && element.cad_component_id === "cad_component_dnp",
    ),
  ).toMatchObject({
    footprinter_string: undefined,
    model_jscad: undefined,
    model_step_url: undefined,
    show_as_bounding_box: false,
  })
})
