import type { AnyCircuitElement } from "circuit-json"
import { getFootprinterModelForAltiumFootprint } from "./get-footprinter-model-for-altium-footprint"
import type { ComponentName, SourceFootprintByComponentName } from "./read-source-footprints"

type SourceComponentId = string
type CadComponentCountBySourceComponentId = Map<SourceComponentId, number>
type SourceComponentElement = AnyCircuitElement & {
  name: ComponentName
  source_component_id: SourceComponentId
  type: "source_component"
}
type CadComponentElement = AnyCircuitElement & {
  footprinter_string?: string
  model_glb_url?: string
  model_gltf_url?: string
  model_jscad?: unknown
  model_obj_url?: string
  model_step_url?: string
  model_stl_url?: string
  show_as_bounding_box?: boolean
  source_component_id: SourceComponentId
  type: "cad_component"
}

export type CadModelEnrichmentSummary = {
  enrichedComponentCount: number
  retainedPrimitiveComponentCount: number
}

export function replacePrimitiveCadModels(params: {
  circuitJson: AnyCircuitElement[]
  sourceFootprintByComponentName: SourceFootprintByComponentName
}): {
  circuitJson: AnyCircuitElement[]
  summary: CadModelEnrichmentSummary
} {
  const sourceComponentNameById = new Map<SourceComponentId, ComponentName>(
    params.circuitJson.flatMap((element) =>
      isSourceComponentElement(element)
        ? [[element.source_component_id, element.name] as const]
        : [],
    ),
  )
  const cadComponentCountBySourceComponentId: CadComponentCountBySourceComponentId = new Map()
  for (const element of params.circuitJson) {
    if (!isCadComponentElement(element)) continue
    const currentCount = cadComponentCountBySourceComponentId.get(element.source_component_id) ?? 0
    cadComponentCountBySourceComponentId.set(element.source_component_id, currentCount + 1)
  }
  let enrichedComponentCount = 0
  let retainedPrimitiveComponentCount = 0

  const enrichedCircuitJson = params.circuitJson.map((element) => {
    if (!isCadComponentElement(element)) return element
    if (hasReusableCadModel(element)) return element
    if (!hasPrimitiveCadModel(element)) return element
    if (cadComponentCountBySourceComponentId.get(element.source_component_id) !== 1) {
      retainedPrimitiveComponentCount += 1
      return element
    }

    const componentName = sourceComponentNameById.get(element.source_component_id)
    const sourceFootprint = componentName
      ? params.sourceFootprintByComponentName.get(componentName)
      : undefined
    const footprinterModel = sourceFootprint
      ? getFootprinterModelForAltiumFootprint(sourceFootprint)
      : undefined
    if (!footprinterModel) {
      retainedPrimitiveComponentCount += 1
      return element
    }

    enrichedComponentCount += 1
    const enrichedCadComponent: CadComponentElement = {
      ...element,
      footprinter_string: footprinterModel,
      model_jscad: undefined,
      show_as_bounding_box: false,
    }
    return enrichedCadComponent
  })

  return {
    circuitJson: enrichedCircuitJson,
    summary: {
      enrichedComponentCount,
      retainedPrimitiveComponentCount,
    },
  }
}

function hasReusableCadModel(cadComponent: CadComponentElement): boolean {
  return Boolean(
    cadComponent.footprinter_string ||
      cadComponent.model_glb_url ||
      cadComponent.model_gltf_url ||
      cadComponent.model_obj_url ||
      cadComponent.model_step_url ||
      cadComponent.model_stl_url,
  )
}

function hasPrimitiveCadModel(cadComponent: CadComponentElement): boolean {
  return Boolean(cadComponent.model_jscad || cadComponent.show_as_bounding_box)
}

function isSourceComponentElement(element: AnyCircuitElement): element is SourceComponentElement {
  return (
    element.type === "source_component" &&
    typeof element.source_component_id === "string" &&
    typeof element.name === "string"
  )
}

function isCadComponentElement(element: AnyCircuitElement): element is CadComponentElement {
  return element.type === "cad_component" && typeof element.source_component_id === "string"
}
