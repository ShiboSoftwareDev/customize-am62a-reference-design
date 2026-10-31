import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import type { SourceFootprintByComponentName } from "../scripts/prebuild-ti-evm-cad-scenes/read-source-footprints"
import { replacePrimitiveCadModels } from "../scripts/prebuild-ti-evm-cad-scenes/replace-primitive-cad-models"

test("applies connector axis offsets after normalizing PCB placement", () => {
  const sourceFootprintByComponentName: SourceFootprintByComponentName = new Map([
    ["J1", "USB2_0_TYPE_C"],
    ["J2", "CONN19_HDMI"],
  ])
  const circuitJson = [
    {
      type: "source_component",
      source_component_id: "source_component_top",
      ftype: "simple_chip",
      name: "J1",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_top",
      source_component_id: "source_component_top",
      center: { x: 0, y: 0 },
      width: 9,
      height: 6,
      layer: "top",
      rotation: 270,
    },
    {
      type: "cad_component",
      cad_component_id: "cad_component_top",
      source_component_id: "source_component_top",
      pcb_component_id: "pcb_component_top",
      position: { x: 0, y: 0, z: 0.8 },
      rotation: { x: 0, y: 0, z: 0 },
      show_as_bounding_box: true,
    },
    {
      type: "source_component",
      source_component_id: "source_component_bottom",
      ftype: "simple_chip",
      name: "J2",
    },
    {
      type: "pcb_component",
      pcb_component_id: "pcb_component_bottom",
      source_component_id: "source_component_bottom",
      center: { x: 10, y: 0 },
      width: 9,
      height: 6,
      layer: "bottom",
      rotation: 90,
    },
    {
      type: "cad_component",
      cad_component_id: "cad_component_bottom",
      source_component_id: "source_component_bottom",
      pcb_component_id: "pcb_component_bottom",
      position: { x: 10, y: 0, z: -0.8 },
      rotation: { x: 0, y: 0, z: 0 },
      show_as_bounding_box: true,
    },
  ] satisfies AnyCircuitElement[]

  const enriched = replacePrimitiveCadModels({ circuitJson, sourceFootprintByComponentName })
  expect(
    enriched.circuitJson.find(
      (element) =>
        element.type === "cad_component" && element.cad_component_id === "cad_component_top",
    ),
  ).toMatchObject({ rotation: { x: 0, y: 0, z: 180 } })
  expect(
    enriched.circuitJson.find(
      (element) =>
        element.type === "cad_component" && element.cad_component_id === "cad_component_bottom",
    ),
  ).toMatchObject({ rotation: { x: 0, y: 180, z: 270 } })
})
