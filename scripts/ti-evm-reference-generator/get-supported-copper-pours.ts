import type { AnyCircuitElement } from "circuit-json"
import { applyToPoint, compose, rotateDEG, translate } from "transformation-matrix"
import { isPcbComponent } from "./circuit-json-elements"
import type { FeatureId, PcbComponentId, SourceComponentId } from "./types"
import type { ComputedCopperPourSettings } from "./copper-pour-settings"

type CircuitPoint = { x: number; y: number }
type PcbCopperPourId = string
type PcbCopperPour = AnyCircuitElement & {
  type: "pcb_copper_pour"
  pcb_copper_pour_id: string
  pcb_component_id?: PcbComponentId
  brep_shape?: {
    outer_ring: { vertices: CircuitPoint[] }
  }
  center?: CircuitPoint
  covered_with_solder_mask?: boolean
  height?: number
  layer: string
  points?: CircuitPoint[]
  rotation?: number
  shape: string
  source_net_id?: string
  width?: number
}
type SourceNet = AnyCircuitElement & {
  type: "source_net"
  source_net_id: string
  name: string
}
type SourceNetId = SourceNet["source_net_id"]
type SourceNetName = SourceNet["name"]

export type SupportedCopperPour = {
  computedSettings?: ComputedCopperPourSettings
  coveredWithSolderMask: boolean
  layer: string
  netName: SourceNetName
  outline: CircuitPoint[]
  pcbCopperPourId: string
  removableFeatureId?: FeatureId
}

export function getSupportedCopperPours(params: {
  circuitJson: AnyCircuitElement[]
  computedCopperPourSettingsById?: ReadonlyMap<PcbCopperPourId, ComputedCopperPourSettings>
  featureIdBySourceComponentId?: ReadonlyMap<SourceComponentId, FeatureId>
}): SupportedCopperPour[] {
  const sourceNetNamesById = new Map<SourceNetId, SourceNetName>(
    params.circuitJson
      .filter((element): element is SourceNet => element.type === "source_net")
      .map((sourceNet) => [sourceNet.source_net_id, sourceNet.name]),
  )
  const existingNetNames = new Set(sourceNetNamesById.values())
  const sourceComponentIdByPcbComponentId = new Map<PcbComponentId, SourceComponentId>(
    params.circuitJson
      .filter(isPcbComponent)
      .map((pcbComponent) => [pcbComponent.pcb_component_id, pcbComponent.source_component_id]),
  )

  return params.circuitJson
    .filter((element): element is PcbCopperPour => element.type === "pcb_copper_pour")
    .flatMap((copperPour) => {
      const outline = getSupportedCopperPourOutline(copperPour)
      if (!outline || outline.length < 3) return []
      const sourceNetName = copperPour.source_net_id
        ? sourceNetNamesById.get(copperPour.source_net_id)
        : undefined
      if (copperPour.source_net_id && !sourceNetName) return []
      const netName =
        sourceNetName ??
        getUnassignedCopperPourNetName({
          existingNetNames,
          pcbCopperPourId: copperPour.pcb_copper_pour_id,
        })

      return [
        {
          ...(params.computedCopperPourSettingsById?.has(copperPour.pcb_copper_pour_id)
            ? {
                computedSettings: params.computedCopperPourSettingsById.get(
                  copperPour.pcb_copper_pour_id,
                ),
              }
            : {}),
          coveredWithSolderMask: copperPour.covered_with_solder_mask ?? true,
          layer: copperPour.layer,
          netName,
          outline,
          pcbCopperPourId: copperPour.pcb_copper_pour_id,
          removableFeatureId:
            params.computedCopperPourSettingsById?.get(copperPour.pcb_copper_pour_id)
              ?.removableFeatureId ??
            getCopperPourFeatureId({
              copperPour,
              featureIdBySourceComponentId: params.featureIdBySourceComponentId,
              sourceComponentIdByPcbComponentId,
            }),
        },
      ]
    })
}

function getCopperPourFeatureId(params: {
  copperPour: PcbCopperPour
  featureIdBySourceComponentId?: ReadonlyMap<SourceComponentId, FeatureId>
  sourceComponentIdByPcbComponentId: ReadonlyMap<PcbComponentId, SourceComponentId>
}): FeatureId | undefined {
  if (!params.copperPour.pcb_component_id) return undefined
  const sourceComponentId = params.sourceComponentIdByPcbComponentId.get(
    params.copperPour.pcb_component_id,
  )
  return sourceComponentId ? params.featureIdBySourceComponentId?.get(sourceComponentId) : undefined
}

export function getSupportedCopperPourOutline(
  copperPour: AnyCircuitElement,
): CircuitPoint[] | undefined {
  if (!isPcbCopperPour(copperPour)) return undefined
  if (copperPour.shape === "polygon") return copperPour.points
  if (copperPour.shape === "brep") {
    return copperPour.brep_shape?.outer_ring.vertices.map(({ x, y }) => ({ x, y }))
  }
  if (copperPour.shape !== "rect") return undefined
  if (!copperPour.center || copperPour.width === undefined || copperPour.height === undefined) {
    return undefined
  }

  const halfWidth = copperPour.width / 2
  const halfHeight = copperPour.height / 2
  const transform = compose(
    translate(copperPour.center.x, copperPour.center.y),
    rotateDEG(copperPour.rotation ?? 0),
  )
  return [
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight },
  ].map((point) => applyToPoint(transform, point))
}

function isPcbCopperPour(element: AnyCircuitElement): element is PcbCopperPour {
  return (
    element.type === "pcb_copper_pour" &&
    "pcb_copper_pour_id" in element &&
    typeof element.pcb_copper_pour_id === "string" &&
    "layer" in element &&
    typeof element.layer === "string" &&
    "shape" in element &&
    typeof element.shape === "string"
  )
}

function getUnassignedCopperPourNetName(params: {
  existingNetNames: Set<SourceNetName>
  pcbCopperPourId: string
}): SourceNetName {
  const baseName = `__unassigned_${params.pcbCopperPourId}`
  let netName = baseName
  let suffix = 2
  while (params.existingNetNames.has(netName)) {
    netName = `${baseName}_${suffix}`
    suffix += 1
  }
  params.existingNetNames.add(netName)
  return netName
}
