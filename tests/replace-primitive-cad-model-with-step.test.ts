import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import { externalStepModelUrls } from "../scripts/prebuild-ti-evm-cad-scenes/external-step-model-urls"
import type { SourceFootprintByComponentName } from "../scripts/prebuild-ti-evm-cad-scenes/read-source-footprints"
import { replacePrimitiveCadModels } from "../scripts/prebuild-ti-evm-cad-scenes/replace-primitive-cad-models"

test("replaces imported connector primitives with exact STEP geometry", () => {
  const sourceFootprintByComponentName: SourceFootprintByComponentName = new Map([
    ["J5", "CON_19X1_10029449-001RLF_S_R_S_6-3"],
  ])
  const circuitJson = [
    {
      type: "source_component",
      source_component_id: "source_component_j5",
      ftype: "simple_chip",
      name: "J5",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_j5",
      source_component_id: "source_component_j5",
      center: { x: 4, y: 7 },
      width: 16,
      height: 8,
      layer: "top",
      rotation: 270,
    },
    {
      type: "cad_component",
      cad_component_id: "cad_component_j5",
      source_component_id: "source_component_j5",
      pcb_component_id: "pcb_component_j5",
      position: { x: 4, y: 7, z: 0.8 },
      rotation: { x: 0, y: 0, z: 0 },
      show_as_bounding_box: true,
    },
  ] satisfies AnyCircuitElement[]

  const enriched = replacePrimitiveCadModels({ circuitJson, sourceFootprintByComponentName })

  expect(
    enriched.circuitJson.find(
      (element) =>
        element.type === "cad_component" && element.cad_component_id === "cad_component_j5",
    ),
  ).toMatchObject({
    model_step_url: externalStepModelUrls.amphenolHdmiA,
    model_unit_to_mm_scale_factor: 1,
    position: { x: 4, y: 7, z: 0.8 },
    rotation: { x: 0, y: 0, z: 270 },
    show_as_bounding_box: false,
  })
})
