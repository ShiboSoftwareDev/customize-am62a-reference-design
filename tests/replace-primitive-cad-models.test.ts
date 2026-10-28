import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import type { SourceFootprintByComponentName } from "../scripts/prebuild-ti-evm-cad-scenes/read-source-footprints"
import { replacePrimitiveCadModels } from "../scripts/prebuild-ti-evm-cad-scenes/replace-primitive-cad-models"

test("replaces primitive imported CAD while preserving external models", () => {
  const sourceFootprintByComponentName: SourceFootprintByComponentName = new Map([
    ["U1", "HDR_2X15_PEC15DAAN_S_T_8-6"],
    ["J1", "CON_CUSTOM"],
  ])
  const circuitJson = [
    {
      type: "source_component",
      source_component_id: "source_component_1",
      ftype: "simple_chip",
      name: "U1",
    },
    {
      type: "source_component",
      source_component_id: "source_component_2",
      ftype: "simple_chip",
      name: "J1",
    },
    {
      type: "cad_component",
      cad_component_id: "cad_component_1",
      source_component_id: "source_component_1",
      position: { x: 1, y: 2, z: 0.8 },
      rotation: { x: 0, y: 0, z: 90 },
      model_jscad: { type: "cube", size: 1 },
    },
    {
      type: "cad_component",
      cad_component_id: "cad_component_2",
      source_component_id: "source_component_2",
      model_glb_url: "/models/connector.glb",
    },
  ] satisfies AnyCircuitElement[]

  const enriched = replacePrimitiveCadModels({
    circuitJson,
    sourceFootprintByComponentName,
  })
  const headerCadModel = enriched.circuitJson.find(
    (element) => element.type === "cad_component" && element.cad_component_id === "cad_component_1",
  )
  const connectorCadModel = enriched.circuitJson.find(
    (element) => element.type === "cad_component" && element.cad_component_id === "cad_component_2",
  )

  expect(headerCadModel).toMatchObject({
    footprinter_string: "headermodule30_rows2_p2.54mm_male",
    model_jscad: undefined,
    position: { x: 1, y: 2, z: 0.8 },
    rotation: { x: 0, y: 0, z: 90 },
  })
  expect(connectorCadModel).toMatchObject({ model_glb_url: "/models/connector.glb" })
  expect(enriched.summary.enrichedComponentCount).toBe(1)
})
