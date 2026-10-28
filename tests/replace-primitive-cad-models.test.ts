import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import type { SourceFootprintByComponentName } from "../scripts/prebuild-ti-evm-cad-scenes/read-source-footprints"
import { replacePrimitiveCadModels } from "../scripts/prebuild-ti-evm-cad-scenes/replace-primitive-cad-models"

test("replaces primitive imported CAD while preserving external models", () => {
  const sourceFootprintByComponentName: SourceFootprintByComponentName = new Map([
    ["U1", "HDR_2X15_PEC15DAAN_S_T_8-6"],
    ["J1", "CON_CUSTOM"],
    ["R1", "RES0402_0-5"],
    ["TP1", "TP20_SMD"],
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
    {
      type: "source_component",
      source_component_id: "source_component_3",
      ftype: "simple_chip",
      name: "R1",
    },
    {
      type: "cad_component",
      cad_component_id: "cad_component_3",
      source_component_id: "source_component_3",
      model_jscad: {
        type: "colorize",
        shape: {
          type: "extrudeLinear",
          options: { height: 3 },
          shape: {
            type: "fromPointsGeom2",
            points: [
              [-4, -3],
              [4, -3],
              [4, 3],
              [-4, 3],
            ],
          },
        },
      },
    },
    {
      type: "source_component",
      source_component_id: "source_component_4",
      ftype: "simple_chip",
      name: "TP1",
    },
    {
      type: "cad_component",
      cad_component_id: "cad_component_4",
      source_component_id: "source_component_4",
      model_jscad: { type: "cuboid", size: [1, 1, 1] },
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
  const resistorCadModel = enriched.circuitJson.find(
    (element) => element.type === "cad_component" && element.cad_component_id === "cad_component_3",
  )
  const testPointCadModel = enriched.circuitJson.find(
    (element) => element.type === "cad_component" && element.cad_component_id === "cad_component_4",
  )

  expect(headerCadModel).toMatchObject({
    footprinter_string: "headermodule30_rows2_p2.54mm_male",
    model_jscad: undefined,
    position: { x: 1, y: 2, z: 0.8 },
    rotation: { x: 0, y: 0, z: 90 },
  })
  expect(connectorCadModel).toMatchObject({ model_glb_url: "/models/connector.glb" })
  expect(resistorCadModel).toMatchObject({
    model_jscad: expect.any(Array),
  })
  expect(testPointCadModel).toMatchObject({
    model_jscad: undefined,
    show_as_bounding_box: false,
  })
  expect(enriched.summary.enrichedComponentCount).toBe(3)
})
