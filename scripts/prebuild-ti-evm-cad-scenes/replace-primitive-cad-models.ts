import type { AnyCircuitElement } from "circuit-json"
import { applyToPoint, rotateDEG } from "transformation-matrix"
import { type CadModelReplacement, getCadModelReplacement } from "./get-cad-model-replacement"
import type { ComponentName, SourceFootprintByComponentName } from "./read-source-footprints"
import {
  getPadRegisteredModelPlacement,
  type CadRegistrationPad,
} from "./get-pad-registered-model-placement"
import { getImportedPrimitivePlanarPosition } from "./get-imported-primitive-planar-position"
import { getModelLocalPads } from "./get-model-local-pads"

type PcbComponentId = string
type SourceComponentId = string
type CadComponentCountBySourceComponentId = Map<SourceComponentId, number>
type PcbComponentBySourceComponentId = Map<SourceComponentId, PcbComponentElement>
type SourceComponentElement = AnyCircuitElement & {
  manufacturer_part_number?: string
  name: ComponentName
  source_component_id: SourceComponentId
  type: "source_component"
}
type CadComponentElement = AnyCircuitElement & {
  footprinter_string?: string
  model_glb_url?: string
  model_gltf_url?: string
  model_jscad?: unknown
  model_unit_to_mm_scale_factor?: number
  model_obj_url?: string
  model_step_url?: string
  model_stl_url?: string
  position?: { x: number; y: number; z: number }
  rotation?: { x: number; y: number; z: number }
  show_as_bounding_box?: boolean
  source_component_id: SourceComponentId
  type: "cad_component"
}
type PcbComponentElement = AnyCircuitElement & {
  layer: "bottom" | "top"
  rotation: number
  source_component_id: SourceComponentId
  type: "pcb_component"
}

export type CadModelEnrichmentSummary = {
  enrichedComponentCount: number
  retainedPrimitiveComponentCount: number
}

export function replacePrimitiveCadModels(params: {
  circuitJson: AnyCircuitElement[]
  excludedComponentNames?: ReadonlySet<ComponentName>
  sourceFootprintByComponentName: SourceFootprintByComponentName
}): {
  circuitJson: AnyCircuitElement[]
  summary: CadModelEnrichmentSummary
} {
  const sourceComponentById = new Map<SourceComponentId, SourceComponentElement>(
    params.circuitJson.flatMap((element) =>
      isSourceComponentElement(element) ? [[element.source_component_id, element] as const] : [],
    ),
  )
  const cadComponentCountBySourceComponentId: CadComponentCountBySourceComponentId = new Map()
  const pcbComponentBySourceComponentId: PcbComponentBySourceComponentId = new Map(
    params.circuitJson.flatMap((element) =>
      isPcbComponentElement(element) ? [[element.source_component_id, element] as const] : [],
    ),
  )
  for (const element of params.circuitJson) {
    if (!isCadComponentElement(element)) continue
    const currentCount = cadComponentCountBySourceComponentId.get(element.source_component_id) ?? 0
    cadComponentCountBySourceComponentId.set(element.source_component_id, currentCount + 1)
  }
  const padsByPcbComponentId = new Map<PcbComponentId, CadRegistrationPad[]>()
  for (const element of params.circuitJson) {
    if (
      (element.type !== "pcb_smtpad" && element.type !== "pcb_plated_hole") ||
      typeof element.pcb_component_id !== "string"
    )
      continue
    const pads = padsByPcbComponentId.get(element.pcb_component_id) ?? []
    pads.push({
      type: element.type,
      x: typeof element.x === "number" ? element.x : undefined,
      y: typeof element.y === "number" ? element.y : undefined,
      width: typeof element.width === "number" ? element.width : undefined,
      height: typeof element.height === "number" ? element.height : undefined,
      radius: typeof element.radius === "number" ? element.radius : undefined,
      ccw_rotation: typeof element.ccw_rotation === "number" ? element.ccw_rotation : undefined,
      port_hints: Array.isArray(element.port_hints)
        ? element.port_hints.filter((hint): hint is string => typeof hint === "string")
        : undefined,
    })
    padsByPcbComponentId.set(element.pcb_component_id, pads)
  }
  let enrichedComponentCount = 0
  let retainedPrimitiveComponentCount = 0

  const enrichedCircuitJson = params.circuitJson.map((element) => {
    if (!isCadComponentElement(element)) return element
    const sourceComponent = sourceComponentById.get(element.source_component_id)
    if (sourceComponent && params.excludedComponentNames?.has(sourceComponent.name)) {
      enrichedComponentCount += 1
      return applyCadModelReplacement({ cadComponent: element, replacement: { kind: "none" } })
    }
    if (hasReusableCadModel(element)) return element
    if (!hasPrimitiveCadModel(element)) return element
    if (cadComponentCountBySourceComponentId.get(element.source_component_id) !== 1) {
      retainedPrimitiveComponentCount += 1
      return element
    }

    const sourceFootprint = sourceComponent
      ? params.sourceFootprintByComponentName.get(sourceComponent.name)
      : undefined
    const pcbComponent = pcbComponentBySourceComponentId.get(element.source_component_id)
    const pads =
      padsByPcbComponentId.get(
        typeof element.pcb_component_id === "string" ? element.pcb_component_id : "",
      ) ?? []
    const position = getReplacementPosition(element)
    const modelLocalPads =
      pcbComponent && position
        ? getModelLocalPads({
            pads,
            position,
            layer: pcbComponent.layer,
            ccwRotationDegrees: pcbComponent.rotation,
          })
        : []
    const replacement = sourceFootprint
      ? getCadModelReplacement(
          {
            altiumFootprint: sourceFootprint,
            componentName: sourceComponent?.name ?? "",
            manufacturerPartNumber: sourceComponent?.manufacturer_part_number,
          },
          modelLocalPads,
        )
      : undefined
    if (!replacement) {
      retainedPrimitiveComponentCount += 1
      return element
    }

    enrichedComponentCount += 1
    return applyCadModelReplacement({
      cadComponent: element,
      pads,
      pcbComponent,
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
  pcbComponent?: PcbComponentElement
  pads?: CadRegistrationPad[]
  replacement: CadModelReplacement
}): CadComponentElement {
  const modelYawOffsetDegrees =
    params.replacement.kind === "none" ? undefined : params.replacement.modelYawOffsetDegrees
  const registeredPlacement =
    (params.replacement.modelFootprintString || params.replacement.modelPinPositions) &&
    params.pcbComponent
      ? getPadRegisteredModelPlacement({
          layer: params.pcbComponent.layer,
          modelFootprintString: params.replacement.modelFootprintString,
          modelPinPositions: params.replacement.modelPinPositions,
          pads: params.pads ?? [],
        })
      : undefined
  let rotation = params.cadComponent.rotation
  if (params.pcbComponent) {
    rotation = getCanonicalCadRotation({ modelYawOffsetDegrees, pcbComponent: params.pcbComponent })
  }
  if (registeredPlacement) {
    rotation = {
      x: 0,
      y: params.pcbComponent?.layer === "bottom" ? 180 : 0,
      z: normalizeDegrees(registeredPlacement.ccwRotationDegrees + (modelYawOffsetDegrees ?? 0)),
    }
  }
  if (rotation) {
    rotation = { ...rotation, x: params.replacement.modelXRotationDegrees ?? rotation.x }
  }
  const importedPrimitivePosition = getReplacementPosition(params.cadComponent)
  const position =
    registeredPlacement && importedPrimitivePosition
      ? { ...importedPrimitivePosition, ...registeredPlacement.position }
      : importedPrimitivePosition
  const cadComponentWithoutPrimitive: CadComponentElement = {
    ...params.cadComponent,
    footprinter_string: undefined,
    model_glb_url: undefined,
    model_gltf_url: undefined,
    model_jscad: undefined,
    model_unit_to_mm_scale_factor: undefined,
    model_obj_url: undefined,
    model_step_url: undefined,
    model_stl_url: undefined,
    model_board_normal_direction:
      params.replacement.modelBoardNormalDirection ??
      params.cadComponent.model_board_normal_direction,
    model_origin_position:
      params.replacement.modelOriginPosition ?? params.cadComponent.model_origin_position,
    position: getPositionWithModelOffset({
      modelPlanarOffsetMillimeters:
        params.replacement.kind === "jscad" ||
        params.replacement.kind === "step" ||
        params.replacement.kind === "glb"
          ? params.replacement.modelPlanarOffsetMillimeters
          : undefined,
      modelVerticalOffsetMillimeters: params.replacement.modelVerticalOffsetMillimeters,
      position,
      rotation,
    }),
    rotation,
    show_as_bounding_box: false,
  }

  if (params.replacement.kind === "none") return cadComponentWithoutPrimitive

  if (params.replacement.kind === "footprinter") {
    return {
      ...cadComponentWithoutPrimitive,
      footprinter_string: params.replacement.footprinterString,
    }
  }

  if (params.replacement.kind === "step") {
    return {
      ...cadComponentWithoutPrimitive,
      model_step_url: params.replacement.modelStepUrl,
      model_unit_to_mm_scale_factor: 1,
    }
  }

  if (params.replacement.kind === "glb") {
    return {
      ...cadComponentWithoutPrimitive,
      model_glb_url: params.replacement.modelGlbUrl,
      model_unit_to_mm_scale_factor: params.replacement.modelUnitToMmScaleFactor,
    }
  }

  return {
    ...cadComponentWithoutPrimitive,
    model_jscad: params.replacement.jscadOperations,
  }
}

// Converts a model-local XY offset into circuit-board coordinates. Bottom-side
// models first mirror local X around the board normal, then apply their yaw.
function getPositionWithModelOffset({
  modelPlanarOffsetMillimeters,
  modelVerticalOffsetMillimeters = 0,
  position,
  rotation,
}: {
  modelPlanarOffsetMillimeters?: { x: number; y: number }
  modelVerticalOffsetMillimeters?: number
  position?: { x: number; y: number; z: number }
  rotation?: { x: number; y: number; z: number }
}): CadComponentElement["position"] {
  if (!position) return position
  if (!modelPlanarOffsetMillimeters || !rotation) {
    return { ...position, z: position.z + modelVerticalOffsetMillimeters }
  }
  const localOffset = {
    x:
      normalizeDegrees(rotation.y) === 180
        ? -modelPlanarOffsetMillimeters.x
        : modelPlanarOffsetMillimeters.x,
    y: modelPlanarOffsetMillimeters.y,
  }
  const boardOffset = applyToPoint(rotateDEG(rotation.z), localOffset)
  return {
    x: position.x + boardOffset.x,
    y: position.y + boardOffset.y,
    z: position.z + modelVerticalOffsetMillimeters,
  }
}

function getReplacementPosition(
  cadComponent: CadComponentElement,
): CadComponentElement["position"] {
  const importedPrimitivePlanarPosition = getImportedPrimitivePlanarPosition({
    modelJscad: cadComponent.model_jscad,
    modelUnitToMmScaleFactor: cadComponent.model_unit_to_mm_scale_factor,
    position: cadComponent.position,
    rotation: cadComponent.rotation,
  })
  if (!importedPrimitivePlanarPosition || !cadComponent.position) {
    return cadComponent.position
  }

  return {
    ...cadComponent.position,
    ...importedPrimitivePlanarPosition,
  }
}

function getCanonicalCadRotation({
  modelYawOffsetDegrees = 0,
  pcbComponent,
}: {
  modelYawOffsetDegrees?: number
  pcbComponent: PcbComponentElement
}): NonNullable<CadComponentElement["rotation"]> {
  if (pcbComponent.layer === "bottom") {
    return {
      x: 0,
      y: 180,
      z: normalizeDegrees(-pcbComponent.rotation + modelYawOffsetDegrees),
    }
  }
  return {
    x: 0,
    y: 0,
    z: normalizeDegrees(pcbComponent.rotation + modelYawOffsetDegrees),
  }
}

function normalizeDegrees(angleDegrees: number): number {
  return ((angleDegrees % 360) + 360) % 360
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
    typeof element.source_component_id === "string" &&
    (element.layer === "top" || element.layer === "bottom") &&
    typeof element.rotation === "number"
  )
}
