import type { AnyCircuitElement } from "circuit-json"
import { applyToPoint, compose, rotateDEG, translate } from "transformation-matrix"

type CircuitPoint = { x: number; y: number }
type PcbCopperPour = AnyCircuitElement & {
  type: "pcb_copper_pour"
  pcb_copper_pour_id: string
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
  coveredWithSolderMask: boolean
  layer: string
  netName: SourceNetName
  outline: CircuitPoint[]
}

export function getSupportedCopperPours(params: {
  circuitJson: AnyCircuitElement[]
}): SupportedCopperPour[] {
  const sourceNetNamesById = new Map<SourceNetId, SourceNetName>(
    params.circuitJson
      .filter((element): element is SourceNet => element.type === "source_net")
      .map((sourceNet) => [sourceNet.source_net_id, sourceNet.name]),
  )
  const existingNetNames = new Set(sourceNetNamesById.values())

  return params.circuitJson
    .filter((element): element is PcbCopperPour => element.type === "pcb_copper_pour")
    .flatMap((copperPour) => {
      const outline = getSupportedOutline(copperPour)
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
          coveredWithSolderMask: copperPour.covered_with_solder_mask ?? true,
          layer: copperPour.layer,
          netName,
          outline,
        },
      ]
    })
}

function getSupportedOutline(copperPour: PcbCopperPour): CircuitPoint[] | undefined {
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
