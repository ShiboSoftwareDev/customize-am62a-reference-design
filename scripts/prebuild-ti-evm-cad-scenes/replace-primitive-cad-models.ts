import type { AnyCircuitElement } from "circuit-json"
import {
  type CadModelReplacement,
  getCadModelReplacementForAltiumFootprint,
} from "./get-cad-model-replacement-for-altium-footprint"
import { getPrimitiveCadModelSize, type CadModelSize } from "./get-primitive-cad-model-size"
import type { ComponentName, SourceFootprintByComponentName } from "./read-source-footprints"

type SourceComponentId = string
type PcbComponentId = string
type CadComponentCountBySourceComponentId = Map<SourceComponentId, number>
type PcbComponentSizeById = Map<PcbComponentId, Omit<CadModelSize, "z">>
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
  model_object_fit?: "contain_within_bounds" | "fill_bounds"
  model_step_url?: string
  model_stl_url?: string
  pcb_component_id?: PcbComponentId
  show_as_bounding_box?: boolean
  size?: CadModelSize
  source_component_id: SourceComponentId
  type: "cad_component"
}
type PcbComponentElement = AnyCircuitElement & {
  height: number
  pcb_component_id: PcbComponentId
  type: "pcb_component"
  width: number
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
  const pcbComponentSizeById: PcbComponentSizeById = new Map(
    params.circuitJson.flatMap((element) =>
      isPcbComponentElement(element)
        ? [[element.pcb_component_id, { x: element.width, y: element.height }] as const]
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
    const replacement = sourceFootprint
      ? getCadModelReplacementForAltiumFootprint(sourceFootprint)
      : undefined
    if (!replacement) {
      retainedPrimitiveComponentCount += 1
      return element
    }

    enrichedComponentCount += 1
    return applyCadModelReplacement({
      cadComponent: element,
      pcbComponentSize: element.pcb_component_id
        ? pcbComponentSizeById.get(element.pcb_component_id)
        : undefined,
      replacement,
    })
  })

  return {
    circuitJson: enrichedCircuitJson,
    summary: {
      enrichedComponentCount,
      retainedPrimitiveComponentCount,
    },
  }
}

function applyCadModelReplacement(params: {
  cadComponent: CadComponentElement
  pcbComponentSize?: Omit<CadModelSize, "z">
  replacement: CadModelReplacement
}): CadComponentElement {
  const cadComponentWithoutPrimitive: CadComponentElement = {
    ...params.cadComponent,
    model_jscad: undefined,
    show_as_bounding_box: false,
  }

  if (params.replacement.kind === "footprinter") {
    return {
      ...cadComponentWithoutPrimitive,
      footprinter_string: params.replacement.footprinterString,
    }
  }

  const authoredSize =
    params.cadComponent.size ?? getPrimitiveCadModelSize(params.cadComponent.model_jscad)
  const footprintSize = authoredSize ?? params.pcbComponentSize
  const fittedSize = footprintSize
    ? { ...footprintSize, z: params.replacement.fitHeightMm }
    : undefined

  return {
    ...cadComponentWithoutPrimitive,
    model_step_url: params.replacement.modelStepUrl,
    model_object_fit: "contain_within_bounds",
    size: fittedSize,
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

function isPcbComponentElement(element: AnyCircuitElement): element is PcbComponentElement {
  return (
    element.type === "pcb_component" &&
    typeof element.pcb_component_id === "string" &&
    typeof element.width === "number" &&
    typeof element.height === "number"
  )
}
