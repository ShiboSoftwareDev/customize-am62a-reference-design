import { expect, test } from "bun:test"
import type { AnyCircuitElement } from "circuit-json"
import type { SourceFootprintByComponentName } from "../scripts/prebuild-ti-evm-cad-scenes/read-source-footprints"
import { replacePrimitiveCadModels } from "../scripts/prebuild-ti-evm-cad-scenes/replace-primitive-cad-models"

test("preserves components assembled from multiple primitive CAD bodies", () => {
  const circuitJson = [
    {
      type: "source_component",
      source_component_id: "source_component_1",
      ftype: "simple_chip",
      name: "J1",
    },
    {
      type: "cad_component",
      cad_component_id: "cad_component_1",
      source_component_id: "source_component_1",
      model_jscad: { type: "cube", size: 1 },
    },
    {
      type: "cad_component",
      cad_component_id: "cad_component_2",
      source_component_id: "source_component_1",
      model_jscad: { type: "cylinder", radius: 0.5, height: 1 },
    },
  ] satisfies AnyCircuitElement[]
  const sourceFootprintByComponentName: SourceFootprintByComponentName = new Map([
    ["J1", "HDR_2X15_PEC15DAAN_S_T_8-6"],
  ])

  const enriched = replacePrimitiveCadModels({
    circuitJson,
    sourceFootprintByComponentName,
  })
  const cadComponents = enriched.circuitJson.filter((element) => element.type === "cad_component")

  expect(cadComponents).toHaveLength(2)
  expect(cadComponents.every((component) => component.footprinter_string === undefined)).toBe(true)
  expect(enriched.summary.enrichedComponentCount).toBe(0)
  expect(enriched.summary.retainedPrimitiveComponentCount).toBe(2)
})
